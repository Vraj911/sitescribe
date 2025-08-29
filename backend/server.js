const express=require('express');
const cors=require('cors');
const bodyParser=require('body-parser');
const app=express();
const port=3000;
const connectDB=require('./config/config.js');
const authRoutes=require('./routes/authRoutes.js');
const authMiddleware=require('./middleware/auth.js');
require('dotenv').config();
connectDB();
console.log('JWT_SECRET:', process.env.JWT_SECRET); 
app.use(cors());
app.use(bodyParser.json());
app.use(express.json()) 
app.get('/',(req,res)=>{
    res.send('Hello World!');
});
app.use('/api/auth',authRoutes);
app.use(authMiddleware);
app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`);
}); 
