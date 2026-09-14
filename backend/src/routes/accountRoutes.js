const express = require('express');
const {getPersonById} = require('../controllers/accountController');

const router = express.Router();

router.get('/:personId', async (req, res) =>{
	const personId = Number(req.params.personId);

	if(!Number.isInteger(personId) || personId<=0) {
		return res.status(400).json({error:'personId must be a positive integer'});
	}

	try{
		const person = await getPersonById(personId);

		if(!person){
			return res.status(404).json({error:'Person not found'});
		}

		return res.json(person);
	}catch (error){
		return res.status(500).json({error:'Failed to fetch person'});
	}
});

module.exports = router;
