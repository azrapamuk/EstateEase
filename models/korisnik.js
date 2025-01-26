const Sequelize = require("sequelize");
const sequelize = require("./baza.js");

module.exports = function (sequelize, DataTypes) {
    const Korisnik = sequelize.define('Korisnik', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ime: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      prezime: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      username: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
      },
      password: {
          type: Sequelize.STRING,
          allowNull: false
      },
      admin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    },
    {
        tableName: 'Korisnik',
        timestamps: false,
        freezeTableName: true
    });
  
    return Korisnik;
  };