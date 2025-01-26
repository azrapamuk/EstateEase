const express = require('express');
const session = require("express-session");
const path = require('path');
const bcrypt = require('bcrypt');
const sequelize = require('./models/baza.js');
const { Op } = require('sequelize');

const Korisnik = require('./models/korisnik.js')(sequelize, require('sequelize'));
const Nekretnina = require('./models/nekretnina.js')(sequelize, require('sequelize'));
const Upit = require('./models/upit.js')(sequelize, require('sequelize'));
const Zahtjev = require('./models/zahtjev.js')(sequelize, require('sequelize'));
const Ponuda = require('./models/ponuda.js')(sequelize, require('sequelize'));

const app = express();
const PORT = 3000;


app.use(session({
    secret: 'tajna sifra',
    resave: true,
    saveUninitialized: true
}));

app.use(express.static(__dirname + '/public'));

// Enable JSON parsing without body-parser
app.use(express.json());

/* ---------------- SERVING HTML -------------------- */

// Async function for serving html files
async function serveHTMLFile(req, res, fileName) {
    const htmlPath = path.join(__dirname, 'public/html', fileName);
    res.sendFile(htmlPath);
}

function zahtjevajPrijavu(req, res, next) {
    if (!req.session.username) {
        return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }
    // Dodaj korisnika u req objekt za daljnju upotrebu u rutama
    Korisnik.findOne({ where: { username: req.session.username } })
        .then(korisnik => {
            req.user = korisnik; // Postavi korisnika u req.user
            next();
        })
        .catch(err => {
            console.error("Greška pri dohvaćanju korisnika u zahtjevajPrijavu middleware:", err);
            return res.status(500).json({ greska: 'Greška servera prilikom autentikacije' });
        });
}

function isAdmin(korisnik) {
    if (!korisnik) return false; // Ako nema korisnika, nije admin
    // Primjer: pretpostavljam da imaš 'uloga' atribut u Korisnik modelu i 'admin' vrijednost
    return korisnik.uloga === 'admin'; // **VAŽNO:** Prilagodi ovo svojoj logici administratorske uloge
}

// Array of HTML files and their routes
const routes = [
    { route: '/nekretnine.html', file: 'nekretnine.html' },
    { route: '/detalji.html', file: 'detalji.html' },
    { route: '/meni.html', file: 'meni.html' },
    { route: '/prijava.html', file: 'prijava.html' },
    { route: '/profil.html', file: 'profil.html', authRequired: true },
    { route: '/mojiUpiti.html', file: 'mojiUpiti.html' },
    { route: '/statistika.html', file: 'statistika.html' },
    { route: '/vijesti.html', file: 'vijesti.html' }
    // Practical for adding more .html files as the project grows
];

// Loop through the array so HTML can be served
routes.forEach(({ route, file, authRequired }) => {
    app.get(route, authRequired ? zahtjevajPrijavu : (req, res, next) => next(), async (req, res) => {
        await serveHTMLFile(req, res, file);
    });
});


/* ----------- SERVING OTHER ROUTES --------------- */


// In-memory storage for failed login attempts and block times
const loginAttempts = {};
const MAX_LOGIN_ATTEMPTS = 3;
const BLOCK_DURATION = 60 * 1000; // 1 minute in milliseconds

// Function to log login attempts
async function logLoginAttempt(username, status) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] - username: "${username}" - status: "${status}"\n`;
    try {
        await fs.promises.appendFile(path.join(__dirname, 'prijave.txt'), logMessage, 'utf-8');
    } catch (error) {
        console.error('Error logging login attempt:', error);
    }
}


/*
Checks if the user exists and if the password is correct based on korisnici.json data.
If the data is correct, the username is saved in the session and a success message is sent.
Added login attempt limiting and logging.
*/
app.post('/login', async (req, res) => {
    const jsonObj = req.body;
    const username = jsonObj.username;

    if (loginAttempts[username] && loginAttempts[username].blockUntil > Date.now()) {
        await logLoginAttempt(username, "neuspješno - blokiran");
        return res.status(429).json({ greska: "Previse neuspjesnih pokusaja. Pokusajte ponovo za 1 minutu." });
    }

    try {
        const korisnik = await Korisnik.findOne({ where: { username: username } });

        if (!korisnik) {
            await logLoginAttempt(username, "neuspješno");
            if (!loginAttempts[username]) {
                loginAttempts[username] = { failedAttempts: 1, blockUntil: 0 };
            } else {
                loginAttempts[username].failedAttempts++;
            }

            if (loginAttempts[username].failedAttempts >= MAX_LOGIN_ATTEMPTS) {
                loginAttempts[username].blockUntil = Date.now() + BLOCK_DURATION;
            }
            return res.json({ poruka: 'Neuspješna prijava' });
        }

        const isPasswordMatched = await bcrypt.compare(jsonObj.password, korisnik.password);

        if (isPasswordMatched) {
            req.session.username = korisnik.username;

            if (loginAttempts[username]) {
                delete loginAttempts[username];
            }
            await logLoginAttempt(username, "uspješno");
            return res.json({ poruka: 'Uspješna prijava' });
        } else {
            await logLoginAttempt(username, "neuspješno");
            if (!loginAttempts[username]) {
                loginAttempts[username] = { failedAttempts: 1, blockUntil: 0 };
            } else {
                loginAttempts[username].failedAttempts++;
            }

            if (loginAttempts[username].failedAttempts >= MAX_LOGIN_ATTEMPTS) {
                loginAttempts[username].blockUntil = Date.now() + BLOCK_DURATION;
            }
            return res.json({ poruka: 'Neuspješna prijava' });
        }


    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Delete everything from the session.
*/
app.post('/logout', (req, res) => {
    // Check if the user is authenticated
    if (!req.session.username) {
        // User is not logged in
        return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Clear all information from the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            res.status(500).json({ greska: 'Internal Server Error' });
        } else {
            res.status(200).json({ poruka: 'Uspješno ste se odjavili' });
        }
    });
});

/*
Returns currently logged user data. First takes the username from the session and grabs other data
from the .json file.
*/
app.get('/korisnik', zahtjevajPrijavu, async (req, res) => {
    const username = req.session.username;

    try {
        const korisnik = await Korisnik.findOne({
            where: { username: username },
            attributes: ['id', 'ime', 'prezime', 'username'] // Exclude password
        });

        if (!korisnik) {
            return res.status(404).json({ greska: 'Korisnik nije pronađen' });
        }

        res.status(200).json(korisnik);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

const MAX_UPITA_PER_NEKRETNINA = 3;

/*
Allows logged user to make a request for a property
*/
app.post('/upit', zahtjevajPrijavu, async (req, res) => {
    const { nekretnina_id, tekst_upita } = req.body;
    const username = req.session.username;

    try {
        const korisnik = await Korisnik.findOne({ where: { username: username } });

        const userId = korisnik.id;

        const nekretnina = await Nekretnina.findByPk(nekretnina_id);
        if (!nekretnina) {
            return res.status(404).json({ greska: `Nekretnina sa id-em ${nekretnina_id} ne postoji` });
        }

        const upitCount = await Upit.count({
            where: {
                nekretninaId: nekretnina_id,
                korisnikId: userId
            }
        });

        if (upitCount >= MAX_UPITA_PER_NEKRETNINA) {
            return res.status(429).json({ greska: "Previse upita za istu nekretninu." });
        }

        await Upit.create({
            nekretninaId: nekretnina_id,
            korisnikId: userId,
            tekst: tekst_upita
        });

        res.status(200).json({ poruka: 'Upit je uspješno dodan' });

    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns all queries for the logged in user.
*/
app.get('/upiti/moji', zahtjevajPrijavu, async (req, res) => {
    try {

        const korisnik = await Korisnik.findOne({
            where: {
                username: req.session.username
            }
        });

        id = korisnik.id;

        const upitiData = await Upit.findAll({
            where: {
                korisnikId: id
            },
            attributes: [
                ['nekretninaId', 'id_nekretnine'],
                ['tekst', 'tekst_upita']
            ]

        });

        res.json(upitiData);

    } catch (error) {
        console.error('Error fetching user queries:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns details for a specific property by ID, with last 3 queries.
*/
app.get('/nekretnina/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const nekretninaData = await Nekretnina.findByPk(id);

        const upitiData = await Upit.findAll({
            where: {
                nekretninaId: id
            }
        });

        if (nekretninaData) {
            const formattedNekretnina = {
                id: nekretninaData.id,
                tip_nekretnine: nekretninaData.tip_nekretnine,
                naziv: nekretninaData.naziv,
                kvadratura: nekretninaData.kvadratura,
                cijena: nekretninaData.cijena,
                tip_grijanja: nekretninaData.tip_grijanja,
                lokacija: nekretninaData.lokacija,
                godina_izgradnje: nekretninaData.godina_izgradnje,
                datum_objave: nekretninaData.datum_objave,
                opis: nekretninaData.opis,
                upiti: upitiData.map(upit => ({
                    korisnik_id: upit.korisnikId,
                    tekst_upita: upit.tekst
                }))
            };

            res.json(formattedNekretnina);
        } else {
            // Obradi slučaj kada nekretnina nije pronađena po ID-u
            console.log("Nekretnina nije pronađena.");
            res.status(404).json({ greska: 'Nije pronadjena nekretnina sa tim IDjem' });
        }
    } catch (error) {
        console.error('Error fetching property data:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns next 3 queries for a property based on page number.
*/
app.get('/next/upiti/nekretnina/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page);

        // Validacija inputa - prebaceno na pocetak try bloka za bolju citljivost
        if (isNaN(id)) {
            return res.status(400).json({ greska: "Nekretnina ID mora biti broj." });
        }
        if (isNaN(page)) {
            return res.status(400).json({ greska: "Page mora biti broj." });
        }
        if (page < 0) {
            return res.status(400).json({ greska: "Page ne moze biti negativan broj." });
        }

        const pageSize = 3;

        const nekretnina = await Nekretnina.findByPk(id);
        if (!nekretnina) {
            console.log(`Nekretnina sa id-em ${id} nije pronađena.`); // Logiranje za server
            return res.status(404).json({ greska: `Nije pronadjena nekretnina sa IDjem: ${id}` });
        }

        const offset = page * pageSize; // Izračunaj offset na osnovu stranice

        const upitiData = await Upit.findAll({
            where: {
                nekretninaId: id,
            },
            order: [['id', 'DESC']], // **Ključno: Poredaj silazno po datumu kreiranja (ili drugom stupcu za redoslijed)**
            limit: pageSize, // Ograniči broj rezultata po stranici
            offset: offset, // Preskoči određeni broj rezultata
        });

        res.status(200).json(upitiData); // Uspješan odgovor sa formatiranim upitima

    } catch (error) {
        console.error('Error fetching next queries for property:', error); // Detaljno logiranje greške
        res.status(500).json({ greska: 'Internal Server Error' }); // Generička poruka za 500
    }
});


/*
Updates any user field
*/
app.put('/korisnik', zahtjevajPrijavu, async (req, res) => {
    // Get data from the request body
    const { ime, prezime, username, password } = req.body;
    const currentUsername = req.session.username;

    try {
        const loggedInUser = await Korisnik.findOne({ where: { username: currentUsername } });

        if (!loggedInUser) {
            return res.status(404).json({ greska: 'Korisnik nije pronađen' });
        }

        if (username && username !== currentUsername) {
            const usernameExists = await Korisnik.findOne({ where: { username: username } });
            if (usernameExists) {
                return res.status(400).json({ greska: 'Korisničko ime već postoji.' });
            }
            loggedInUser.username = username;
            req.session.username = username; // Update session if username changed
        }
        if (ime) loggedInUser.ime = ime;
        if (prezime) loggedInUser.prezime = prezime;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            loggedInUser.password = hashedPassword;
        }

        await loggedInUser.save();
        res.status(200).json({ poruka: 'Podaci su uspješno ažurirani' });

    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns all properties from the file.
*/
app.get('/nekretnine', async (req, res) => {
    try {
        const nekretnineData = await Nekretnina.findAll();
        res.json(nekretnineData);
    } catch (error) {
        console.error('Error fetching properties data:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns top 5 newest properties for a given location.
*/
app.get('/nekretnine/top5', async (req, res) => {
    const lokacija = req.query.lokacija;

    if (!lokacija) {
        return res.status(400).json({ greska: "Lokacija je obavezna kao query parametar." });
    }

    try {
        const nekretnineData = await Nekretnina.findAll({
            where: { lokacija: lokacija },
            order: [['datum_objave', 'DESC']],
            limit: 5
        });

        if (nekretnineData.length === 0) {
            return res.status(200).json([]);
        }
        res.status(200).json(nekretnineData);

    } catch (error) {
        console.error('Error fetching and filtering properties:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/* ----------------- MARKETING ROUTES ----------------- */

// Route that increments value of pretrage for one based on list of ids in nizNekretnina
app.post('/marketing/nekretnine', async (req, res) => {
    const { nizNekretnina } = req.body;

    try {
        // Load JSON data
        let preferencije = await readJsonFile('preferencije');

        // Check format
        if (!preferencije || !Array.isArray(preferencije)) {
            console.error('Neispravan format podataka u preferencije.json.');
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Init object for search
        preferencije = preferencije.map((nekretnina) => {
            nekretnina.pretrage = nekretnina.pretrage || 0;
            return nekretnina;
        });

        // Update atribute pretraga
        nizNekretnina.forEach((id) => {
            const nekretnina = preferencije.find((item) => item.id === id);
            if (nekretnina) {
                nekretnina.pretrage += 1;
            }
        });

        // Save JSON file
        await saveJsonFile('preferencije', preferencije);

        res.status(200).json({});
    } catch (error) {
        console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/marketing/nekretnina/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Read JSON
        const preferencije = await readJsonFile('preferencije');

        // Finding the needed objects based on id
        const nekretninaData = preferencije.find((item) => item.id === parseInt(id, 10));

        if (nekretninaData) {
            // Update clicks
            nekretninaData.klikovi = (nekretninaData.klikovi || 0) + 1;

            // Save JSON file
            await saveJsonFile('preferencije', preferencije);

            res.status(200).json({ success: true, message: 'Broj klikova ažuriran.' });
        } else {
            res.status(404).json({ error: 'Nekretnina nije pronađena.' });
        }
    } catch (error) {
        console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/marketing/osvjezi/pretrage', async (req, res) => {
    const { nizNekretnina } = req.body || { nizNekretnina: [] };

    try {
        // Read JSON
        const preferencije = await readJsonFile('preferencije');

        // Finding the needed objects based on id
        const promjene = nizNekretnina.map((id) => {
            const nekretninaData = preferencije.find((item) => item.id === id);
            return { id, pretrage: nekretninaData ? nekretninaData.pretrage : 0 };
        });

        res.status(200).json({ nizNekretnina: promjene });
    } catch (error) {
        console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/marketing/osvjezi/klikovi', async (req, res) => {
    const { nizNekretnina } = req.body || { nizNekretnina: [] };

    try {
        // Read JSON
        const preferencije = await readJsonFile('preferencije');

        // Finding the needed objects based on id
        const promjene = nizNekretnina.map((id) => {
            const nekretninaData = preferencije.find((item) => item.id === id);
            return { id, klikovi: nekretninaData ? nekretninaData.klikovi : 0 };
        });

        res.status(200).json({ nizNekretnina: promjene });
    } catch (error) {
        console.error('Greška prilikom čitanja ili pisanja JSON datoteke:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*spirala 4*/
/*
app.get('/nekretnina/:id/interesovanja', async (req, res) => {
    const nekretninaId = req.params.id;
    const username = req.session.username;

    try {
        const nekretnina = await Nekretnina.findByPk(nekretninaId);

        if (!nekretnina) {
            return res.status(404).json({ message: 'Nekretnina nije pronađena' });
        }

        let interesovanja = await nekretnina.getInteresovanja;
        let korisnik = null;
        let isAdmin = false;
        let korisnikId = null;

        if (username) {
            korisnik = await Korisnik.findOne({
                where: {
                    username: username
                }
            });

            if (korisnik) {
                isAdmin = korisnik.admin;
                korisnikId = korisnik.id;
            }
        }

        if (isAdmin) {
            return res.status(200).json(interesovanja);
        } else {
            const filtriranaInteresovanja = interesovanja.map(interesovanje => {
                let interesovanjePlain = { ...interesovanje };

                console.log("Interesovanje Model Name:", interesovanje.constructor.name); 
                console.log("Interesovanje Plain cijenaPonude (before check):", interesovanjePlain.cijenaPonude);


                if (interesovanje.constructor.name === 'Ponuda' && interesovanjePlain.cijenaPonude !== undefined) { 
                    console.log("Inside Ponuda check - korisnikId:", korisnikId, "interesovanjePlain.korisnikId:", interesovanjePlain.korisnikId);
                    if (korisnikId === null || korisnikId !== interesovanjePlain.korisnikId) {
                        console.log("Deleting cijenaPonude");
                        delete interesovanjePlain.cijenaPonude;
                    } else {
                        console.log("Not deleting cijenaPonude - user is creator");
                    }
                } else {
                    console.log("Not a Ponuda or cijenaPonude undefined");
                }

                console.log("Interesovanje Plain cijenaPonude (after check):", interesovanjePlain.cijenaPonude);
                return interesovanjePlain;
            });
            return res.status(200).json(filtriranaInteresovanja);
        }

    } catch (error) {
        console.error('Greška prilikom dohvaćanja interesovanja:', error);
        res.status(500).json({ message: 'Greška prilikom dohvaćanja interesovanja' });
    }
});
*/
app.get('/nekretnina/:id/interesovanja', async (req, res) => {
    const nekretninaId = req.params.id;
    const username = req.session.username;

    try {
        const nekretnina = await Nekretnina.findByPk(nekretninaId);

        if (!nekretnina) {
            return res.status(404).json({ message: 'Nekretnina nije pronađena' });
        }

        let interesovanja = await nekretnina.getInteresovanja;
        let korisnik = null;
        let isAdmin = false;
        let korisnikId = null;

        if (username) {
            korisnik = await Korisnik.findOne({
                where: {
                    username: username
                }
            });

            if (korisnik) {
                isAdmin = korisnik.admin;
                korisnikId = korisnik.id;
            }
        }

        let upiti = [];
        let ponude = []
        let zahtjevi = []

        for (let i = 0; i < interesovanja.length; i++) {
          if (interesovanja[i].cijenaPonude === undefined && interesovanja[i].trazeniDatum === undefined) {
            upiti.push(interesovanja[i]);
          }
          else if(interesovanja[i].cijenaPonude === undefined && interesovanja[i].trazeniDatum != undefined) {
            zahtjevi.push(interesovanja[i]);
          }
          else{
            if(isAdmin){
                ponude.push(interesovanja[i]);
            }
            else{
                jednoInteresovanje = interesovanja[i];
                if(jednoInteresovanje.korisnikId!=korisnikId){
                    delete jednoInteresovanje.cijenaPonude;
                }
                ponude.push(jednoInteresovanje);
            }
          }
        }

        return res.status(200).json({
            upiti: upiti,
            ponude: ponude,
            zahtjevi: zahtjevi
        });
       // return res.json(upiti);

    } catch (error) {
        console.error('Greška prilikom dohvaćanja interesovanja:', error);
        res.status(500).json({ message: 'Greška prilikom dohvaćanja interesovanja' });
    }
});


app.post('/nekretnina/:id/ponuda', async (req, res) => {
    const nekretninaId = req.params.id;
    const username = req.session.username; 
    const { tekst, ponudaCijene, datumPonude, idVezanePonude, odbijenaPonuda } = req.body;

    try {
        const nekretnina = await Nekretnina.findByPk(nekretninaId);
        if (!nekretnina) {
            return res.status(404).json({ message: 'Nekretnina nije pronađena' });
        }

        if (!username) {
            return res.status(401).json({ message: 'Korisnik nije prijavljen' });
        }

        const korisnik = await Korisnik.findOne({ where: { username: username } });
        if (!korisnik) {
            return res.status(404).json({ message: 'Korisnik nije pronađen' }); 
        }
        const korisnikId = korisnik.id;
        const isAdmin = korisnik.admin;

        if (!tekst || !ponudaCijene || !datumPonude) {
            return res.status(400).json({ message: 'Svi obavezni podaci (tekst, ponudaCijene, datumPonude) moraju biti uneseni.' });
        }

        if (typeof tekst !== 'string') {
            return res.status(400).json({ message: 'Tekst ponude mora biti tekstualnog tipa.' });
        }
        if (isNaN(parseFloat(ponudaCijene)) || parseFloat(ponudaCijene) <= 0) {
            return res.status(400).json({ message: 'Cijena ponude mora biti pozitivan broj.' });
        }
        if (typeof datumPonude !== 'string') { 
            return res.status(400).json({ message: 'Datum ponude mora biti tekstualnog tipa (string).' });
        }

        let vezanaPonuda = null;
        if (idVezanePonude) {
            vezanaPonuda = await Ponuda.findByPk(idVezanePonude);
            if (!vezanaPonuda) {
                return res.status(400).json({ message: 'Vezana ponuda nije pronađena.' });
            }

            let currentPonuda = vezanaPonuda;
            while (currentPonuda) {
                if (currentPonuda.odbijenaPonuda) {
                    return res.status(400).json({ message: 'Nije moguće dodati novu ponudu jer je lanac ponuda prekinut (postoji odbijena ponuda).' });
                }
                if (currentPonuda.vezanaPonudaId === null) {
                    currentPonuda = null; 
                } else {
                    currentPonuda = await Ponuda.findByPk(currentPonuda.vezanaPonudaId);
                }
            }
        } else {
            const postojecePonude = await Ponuda.findAll({
                where: { nekretninaId: nekretninaId, vezanaPonudaId: null }, 
                order: [['id', 'DESC']] 
            });

            for (const ponuda of postojecePonude) { 
                let currentPonudaInChain = ponuda;
                while (currentPonudaInChain) {
                    if (currentPonudaInChain.odbijenaPonuda) {
                        return res.status(400).json({ message: 'Nije moguće dodati novu početnu ponudu jer postoji prekinuti lanac ponuda za ovu nekretninu.' });
                    }
                    if (currentPonudaInChain.vezanaPonudaId === null) {
                        currentPonudaInChain = null;
                    } else {
                        currentPonudaInChain = await Ponuda.findByPk(currentPonudaInChain.vezanaPonudaId);
                    }
                }
            }
        }

        if (idVezanePonude) {
            if (!isAdmin) { 
                let initialPonuda = vezanaPonuda;
                while (initialPonuda.vezanaPonudaId !== null) {
                    initialPonuda = await Ponuda.findByPk(initialPonuda.vezanaPonudaId);
                }

                if (initialPonuda.korisnikId !== korisnikId) {
                    return res.status(403).json({ message: 'Nemate pravo odgovoriti na ovu ponudu jer nije vezana za vašu početnu ponudu.' });
                }
            }
        } else { 
        }

        const novaPonuda = await Ponuda.create({
            nekretninaId: nekretninaId,
            korisnikId: korisnikId,
            tekst: tekst,
            cijenaPonude: ponudaCijene,
            datumPonude: datumPonude,
            vezanaPonudaId: idVezanePonude || null,
            odbijenaPonuda: odbijenaPonuda || false 
        });

        res.status(201).json(novaPonuda);

    } catch (error) {
        console.error('Greška prilikom kreiranja ponude:', error);
        res.status(500).json({ message: 'Greška prilikom kreiranja ponude' });
    }
});

app.post('/nekretnina/:id/zahtjev', async (req, res) => {
    const nekretninaId = req.params.id;
    const username = req.session.username;
    const { tekst, trazeniDatum } = req.body;

    try {
        const nekretnina = await Nekretnina.findByPk(nekretninaId);
        if (!nekretnina) {
            return res.status(404).json({ message: 'Nekretnina nije pronađena' });
        }

        if (!username) {
            return res.status(401).json({ message: 'Korisnik nije prijavljen' });
        }
        const korisnik = await Korisnik.findOne({ where: { username: username } });
        if (!korisnik) {
            return res.status(404).json({ message: 'Korisnik nije pronađen' }); 
        }
        const korisnikId = korisnik.id;

        if (!trazeniDatum) {
            return res.status(400).json({ message: 'Trazeni datum je obavezan' });
        }

        const parsedTrazeniDatum = new Date(trazeniDatum);

        if (isNaN(parsedTrazeniDatum)) {
            return res.status(404).json({ message: 'Trazeni datum nije u ispravnom formatu.' });
        }

        const trenutniDatum = new Date();
        trenutniDatum.setHours(0,0,0,0); 
        parsedTrazeniDatum.setHours(0,0,0,0); 

        if (parsedTrazeniDatum < trenutniDatum) {
            return res.status(404).json({ message: 'Trazeni datum ne može biti u prošlosti' });
        }


        const noviZahtjev = await Zahtjev.create({
            nekretninaId: nekretninaId,
            korisnikId: korisnikId,
            tekst: tekst,
            trazeniDatum: trazeniDatum,
        });

        res.status(201).json(noviZahtjev);

    } catch (error) {
        console.error('Greška prilikom kreiranja zahtjeva:', error);
        res.status(500).json({ message: 'Greška prilikom kreiranja zahtjeva' });
    }
});

app.put('/nekretnina/:id/zahtjev/:zid', async (req, res) => {
    const nekretninaId = req.params.id; 
    const zahtjevId = req.params.zid;
    const username = req.session.username; 
    const { odobren, addToTekst } = req.body;

    try {
        if (!username) {
            return res.status(401).json({ message: 'Korisnik nije prijavljen' });
        }
        const korisnik = await Korisnik.findOne({ where: { username: username } });
        if (!korisnik) {
            return res.status(404).json({ message: 'Korisnik nije pronađen' });
        }
        if (!korisnik.admin) {
            return res.status(403).json({ message: 'Samo administratori imaju pravo odgovoriti na zahtjev.' });
        }

        const zahtjev = await Zahtjev.findByPk(zahtjevId);
        if (!zahtjev) {
            return res.status(404).json({ message: 'Zahtjev nije pronađen' });
        }

        if (odobren === undefined || typeof odobren !== 'boolean') {
            return res.status(400).json({ message: 'Vrijednost "odobren" mora biti boolean (true ili false).' });
        }

        if (!odobren && !addToTekst) {
            return res.status(400).json({ message: 'Ako se zahtjev odbija (odobren: false), morate proslijediti tekst odgovora "addToTekst".' });
        }

        let updatedTekst = zahtjev.tekst;
        if (addToTekst) {
            updatedTekst += `\nODGOVOR ADMINA: ${addToTekst}`;
        }

        await zahtjev.update({
            odobren: odobren,
            tekst: updatedTekst
        });

        const azuriraniZahtjev = await Zahtjev.findByPk(zahtjevId);
        res.status(200).json(azuriraniZahtjev);

    } catch (error) {
        console.error('Greška prilikom odgovaranja na zahtjev:', error);
        res.status(500).json({ message: 'Greška prilikom odgovaranja na zahtjev' });
    }
});


// Sinkronizacija baze podataka
sequelize.sync({ /*force: true*/ alter: true }) // { alter: true }
    .then(() => {
        console.log('Baza je synced.');
        app.listen(PORT, () => { // Pokreni server tek nakon sinkronizacije
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error('Greška pri sinkronizaciji baze podataka:', error);
    });