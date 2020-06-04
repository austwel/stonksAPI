const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

router.get('/', (req, res, next) => {
	res.json({ "error": true, "message": "Request on /stocks must include symbol as path parameter, or alternatively you can hit /stocks/symbols to get all symbols" })
})

router.get('/symbols', (req, res) => {
	for(let [key, value] of Object.entries(req.query)) {
		if(key != 'industry') {
			res.status(400).json({ "error": true, "message": "Invalid query parameter: only 'industry' is permitted" })
			return
		} else {
			req.db.from('stocks').select('name', 'symbol', 'industry').where('industry', 'LIKE', '%'+value+'%').distinct()
				.then((rows) => {
					if(rows.length == 0) {
						res.status(404).json({ "error": true, "message": "Industry sector not found" })
					} else {
						res.status(200).json(rows)
					}
				})
				.catch((err) => {
					console.log(err)
					res.json({ "error": true, "message": "Error in MySQL query" })
				})
			return
		}
	}
	req.db.from('stocks').select('name', 'symbol', 'industry').distinct()
		.then((rows) => {
			res.status(200).json(rows)
		})
		.catch((err) => {
			console.log(err)
			res.json({ "error": true, "message": "Error in MySQL query" })
		})
	
})

router.get('/:Symbol', (req, res) => {
	for(let [key, value] of Object.entries(req.query)) {
		if(key == 'from' || key == 'to') {
			res.status(400).json({ "error": true, "message": "Date parameters only available on authenticated route /stocks/authed" })
			return
		}
	}
	req.db.from('stocks').select('*').where('symbol', '=', req.params.Symbol)
		.then((rows) => {
			if(rows.length == 0) {
				res.status(404).json({ "error": true, "message": "No entry for symbol in stocks database" })
			} else {
				res.status(200).json(rows[0])
			}
		})
		.catch((err) => {
			console.log(err)
			res.json({ "error": true, "Message": "No entry for symbol in stocks database" })
		})
})

const authorize = (req, res, next) => {
	const authorization = req.headers.authorization
	let token = null
	if(authorization && authorization.split(" ").length == 2) {
		token = authorization.split(" ")[1]
	} else {
		res.status(403).json({ "error": true, "message": "Authorization header not found" })
		return
	}
	try {
		const decoded = jwt.verify(token, process.env.SECRET_KEY)
		if(decoded.exp < Date.now()) {
			res.status(403).json({ "error": true, "message": "Authorization header not found" })
			return
		}
		next()
	} catch(e) {
		res.status(403).json({ "error": true, "message": "Authorization header not found" })
	}
}

router.get('/authed/:Symbol', authorize, (req, res) => {
	let dates = ['1970-01-01T00:00:00.000Z', '9999-01-01T00:00:00.000Z']
	let single = true
	for(let [key, value] of Object.entries(req.query)) {
		single = false
		if(key == 'from') {
			dates[0] = new Date(Date.parse(value)).toISOString()
		} else if(key == 'to') {
			dates[1] = new Date(Date.parse(value)).toISOString()
		} else {
			res.status(400).json({ "error": true, "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15" })
			return
		}
	}
	req.db.from('stocks').select('*').whereBetween('timestamp', dates).andWhere('symbol', req.params.Symbol)
		.then((rows) => {
			if(rows.length == 0) {
				res.status(404).json({ "error": true, "message": "No entries available for query symbol for supplied date range" })
			} else if(single) {
				res.status(200).json(rows[0])
			} else {
				res.status(200).json(rows)
			}
		})
		.catch((err) => {
			console.log(err)
		})
})

module.exports = router;
