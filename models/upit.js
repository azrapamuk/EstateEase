const Sequelize = require("sequelize");
const sequelize = require("./baza.js");

module.exports = function (sequelize, DataTypes) {
    const Upit = sequelize.define('Upit', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        korisnikId: {
            type: Sequelize.INTEGER,
            references: {
                model: 'Korisnik',
                key: 'id'
            }
        },
        nekretninaId: {
            type: Sequelize.INTEGER,
            references: {
                model: 'Nekretnina',
                key: 'id',
            },
            allowNull: false,
        },
        tekst: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
    }, {
        timestamps: false,
        tableName: 'Upit',
        freezeTableName: true 
    });

    return Upit;
};