/* Server file is the main backend file and it called the app file app file handling the routing */
import app from './app.js';

//runnning in the port 3000 or defined in the env file 
const PORT = process.env.PORT||3000;

app.listen(PORT, ()=>{
    console.log("Server is running on PORT: "+PORT);
})