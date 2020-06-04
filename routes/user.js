const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

router.post('/register', (req, res, next) => {
	const email = req.body.email
	const password = req.body.password
	if(!email || !password) {
		res.status(400).json({ "error": true, "message": "Request body incomplete - email and password needed" })
	} else {
		req.db.from('users').select('*').where('email', '=', email)
			.then((users) => {
				if(users.length == 0) {
					const saltRounds = 10
					const hash = bcrypt.hashSync(password, saltRounds)
					req.db.from('users').insert({ email, hash })
						.then(_ => {
							res.status(201).json({ "success": true, "message": "User created" })
						})
						.catch(error => {
							res.status(400).json({ "error": true, "message": "Error in database" })
						})
				} else {
					res.status(409).json({ "error": true, "message": "User already exists!" })
				}
			})
	}
})

router.post('/login', (req, res) => {
	const email = req.body.email
	const password = req.body.password
	if(!email || !password) {
		res.status(400).json({ "error": true, "message": "Request body invalid - email and password are required" })
	} else {
		req.db.from('users').select('*').where('email', '=', email)
			.then((users) => {
				if(users.length == 0) {
					res.status(401).json({ "error": true, "message": "Incorrect email or password" })
				} else {
					bcrypt.compare(password, users[0].hash)
						.then((response) => {
							if(response) {
								const secretKey = process.env.SECRET_KEY
								const expires_in = 60 * 60 * 24
								const exp = Date.now() + expires_in * 1000
								const token = jwt.sign({ email, exp }, secretKey)
								res.status(200).json({ token, "token_type": "Bearer", expires_in })
							} else {
								res.status(401).json({ "error": true, "message": "Incorrect email or password" })
							}
						})
						.catch((response) => {
							console.log(response)
						})
					
				}
			})
	}
})

module.exports = router;
