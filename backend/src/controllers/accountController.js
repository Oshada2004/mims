const db = require('./../config/db');

async function getPersonById(personId) {
  try {
    const [rows] = await db.query(
      'SELECT get_person_by_id(?) AS person',
      [personId]
    );

    const person=rows[0]?.person;
    return typeof person==='string'? JSON.parse(person): person;
  } catch (error) {
    console.error(`Error fetching person with ID ${personId}:`, error);
    throw error;
  }
}

module.exports = {
  getPersonById,
};