const db = require('./../config/db');

// Function to fetch a person by ID along with their role
async function getPersonById(personId) {
  try {
    const [rows] = await db.query(
      'SELECT person_id, first_name, last_name, phone_number, person_role FROM PERSON WHERE person_id = ?',
      [personId]
    );

    if (rows.length === 0) {
      return null; // Person not found
    }

    return rows[0];
  } catch (error) {
    console.error(`Error fetching person with ID ${personId}:`, error);
    throw error;
  }
}
moudle.exports = {
  getPersonById,
};