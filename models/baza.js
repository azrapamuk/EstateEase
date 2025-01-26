const Sequelize = require("sequelize");

const sequelize = new Sequelize("wt24", "root", "password", {
    dialect: "mysql",
    host: "localhost"
});

(async () => {
    try {
      await sequelize.authenticate();
      console.log('Uspješno povezivanje na bazu podataka!');
    } catch (error) {
      console.error('Neuspješno povezivanje na bazu podataka:', error);
    }
  })();
module.exports = sequelize;