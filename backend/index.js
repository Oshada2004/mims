require('dotenv').config();

<<<<<<< HEAD
const app = require('./src/app');

const PORT = process.env.PORT || 5000;
=======

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/reports', reportRoutes);
app.use('/api/accounts', accountRoutes);


app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM connection_test');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
>>>>>>> docker

app.listen(PORT, () => {
    console.log(`MIMS Core Banking Service running on port ${PORT}`);
});