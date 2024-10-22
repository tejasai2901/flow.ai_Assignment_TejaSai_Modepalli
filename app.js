const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const { c } = require('tar')

const app = express()
let db=null;

const db_path = path.join(__dirname,'database.db')
const connectingDatabase=async()=>{
    try{
        db = await open({
            filename:db_path,
            driver:sqlite3.Database
        })
        app.listen(3000,()=>{
            console.log("Server is running on http://localhost:3000")
        })   
    }
    catch(e){
        console.log(`Error encountered while connecting to the database ${e.message}`)

    }
}
connectingDatabase()


//POST transactions
app.use(express.json())
app.post('/transactions', async (request, response) => {
    try{
        const transactionDetails = request.body;
        const { type, category, amount, date, description } = transactionDetails;

        const query = `INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)`;

    
        const dbResponse = await db.run(query, [type, category, amount, date, description]);
        const transactionID = dbResponse.lastID; 
        response.send({ transactionId: transactionID });
    }
    
    catch (e) {
        response.status(500).send({ error: e.message });
    }
    
});


//All transactions
app.get('/transactions',async(request,response)=>{
    const query = `SELECT * FROM transactions;`
    const collectedData = await db.all(query)
    response.send(collectedData)
})


//Retrieves a transaction by ID
app.get('/transactions/:id',async(request,response)=>{
    const {id} = request.params
    const query = `SELECT * FROM transactions WHERE id= ${id}`
    const collectedData = await db.get(query)
    response.send(collectedData)
})


//Updates a transaction by ID
app.put('/transactions/:id',async(request,response)=>{
    try{
        const {id} = request.params 
    const transactionDetails = request.body;
    const { type, category, amount, date, description } = transactionDetails;

    const query = `UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?`;

    
    const dbResponse = await db.run(query, [type, category, amount, date, description],[id]);
    const transactionID = dbResponse.lastID; 
    response.send('Update Successful');
    }
    
    catch (error) {
        response.status(500).send({ error: error.message });
    }
})

//Deletes a transaction by ID
app.delete('/transactions/:id',async(request,response)=>{
    const {id} = request.params
    const query = `DELETE FROM transactions WHERE id=?`
    
    const dbResponse = await db.run(query,[id]);
    response.send(`Transaction deleted successfully ID:${id}`)
})




//Retrieves a summary of transactions
app.get('/summary', async (request, response) => {
    const { category } = request.query;


    let query = `
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
        FROM transactions
    `;

    const params = [];
    if (category) {
        query += ' WHERE category = ?';
        params.push(category);
    }

    const summary = await db.get(query, params); 
    const balance = (summary.totalIncome || 0) - (summary.totalExpenses || 0); 
    response.json({ 
        totalIncome: summary.totalIncome || 0, 
        totalExpenses: summary.totalExpenses || 0, 
        balance 
    }); 
});
