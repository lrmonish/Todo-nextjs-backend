const Sequelize = require('sequelize');


const sequelize = new Sequelize(
    {
    dialect: 'postgres',
    host: 'localhost',
    username: 'postgres',
    password: '61232332',
    database: 'Todo',
    port: 5432, 

})


module.exports = sequelize;