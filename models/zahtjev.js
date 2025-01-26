const Sequelize = require("sequelize");
const sequelize = require("./baza.js");

module.exports = function (sequelize, DataTypes) {
    const Zahtjev = sequelize.define('Zahtjev', {
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
            allowNull: true,
        },
        trazeniDatum: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        odobren: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: null,
        },
    }, {
        timestamps: false,
        tableName: 'Zahtjev',
    });

    return Zahtjev;
};