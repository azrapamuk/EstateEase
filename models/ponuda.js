const Sequelize = require("sequelize");
const sequelize = require("./baza.js");

module.exports = function (sequelize, DataTypes) {
    const Ponuda = sequelize.define('Ponuda', {
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
        cijenaPonude: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        },
        datumPonude: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        odbijenaPonuda: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        vezanaPonudaId: {
            type: Sequelize.INTEGER,
            references: {
                model: 'Ponuda',
                key: 'id'
            },
            allowNull: true
        }
    }, {
        timestamps: false,
        tableName: 'Ponuda',
        freezeTableName: true
    });

    Object.defineProperty(Ponuda.prototype, 'vezanePonude', {
        get: async function() {
            const getRelatedOffers = async (ponuda, visited, firstId) => {

                if (visited.some(p => p.id == ponuda.id)){
                    return;
                }
                const relatedOffers = await Ponuda.findAll({
                    where: { vezanaPonudaId: ponuda.id }
                });
                if(ponuda.id != firstId){
                    visited.push(ponuda.dataValues);
                }

                if (relatedOffers.length !== 0) {
                    await Promise.all(relatedOffers.map(p => getRelatedOffers(p, visited, firstId)));
                }
                if(ponuda.vezanaPonudaId !== null){
                    const roditelj = await Ponuda.findOne({
                        where:{
                            id: ponuda.vezanaPonudaId
                        }
                    });
                    if(roditelj){
                        await getRelatedOffers(roditelj, visited, firstId);
                    }
                }
                return;
            };
            let vezane = [];
            await getRelatedOffers(this, vezane, this.id);
            return vezane;
        }
    });

    return Ponuda;
};