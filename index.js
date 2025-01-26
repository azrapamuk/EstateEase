const express = require('express');
const session = require("express-session");
const path = require('path');
const fs = require('fs').promises; // Using asynchronus API for file read and write
const bcrypt = require('bcrypt');

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
    try {
        const content = await fs.readFile(htmlPath, 'utf-8');
        res.send(content);
    } catch (error) {
        console.error('Error serving HTML file:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
}

// Array of HTML files and their routes
const routes = [
    { route: '/nekretnine.html', file: 'nekretnine.html' },
    { route: '/detalji.html', file: 'detalji.html' },
    { route: '/meni.html', file: 'meni.html' },
    { route: '/prijava.html', file: 'prijava.html' },
    { route: '/profil.html', file: 'profil.html' },
    {route:  '/mojiUpiti.html', file: 'mojiUpiti.html'},
    {route:  '/statistika.html', file: 'statistika.html'},
    {route:  '/vijesti.html', file: 'vijesti.html'}
    // Practical for adding more .html files as the project grows
];

// Loop through the array so HTML can be served
routes.forEach(({ route, file }) => {
    app.get(route, async (req, res) => {
        await serveHTMLFile(req, res, file);
    });
});

/* ----------- SERVING OTHER ROUTES --------------- */

// Async function for reading json data from data folder
async function readJsonFile(filename) {
    const filePath = path.join(__dirname, 'data', `${filename}.json`);
    try {
        const rawdata = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(rawdata);
    } catch (error) {
        throw error;
    }
}

// Async function for reading json data from data folder
async function saveJsonFile(filename, data) {
    const filePath = path.join(__dirname, 'data', `${filename}.json`);
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        throw error;
    }
}

// In-memory storage for failed login attempts and block times
const loginAttempts = {};
const MAX_LOGIN_ATTEMPTS = 3;
const BLOCK_DURATION = 60 * 1000; // 1 minute in milliseconds

// Function to log login attempts
async function logLoginAttempt(username, status) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] - username: "${username}" - status: "${status}"\n`;
    try {
        await fs.appendFile(path.join(__dirname, 'prijave.txt'), logMessage, 'utf-8');
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
        const data = await fs.readFile(path.join(__dirname, 'data', 'korisnici.json'), 'utf-8');
        const korisnici = JSON.parse(data);
        let found = false;
        let successfulLogin = false;

        for (const korisnik of korisnici) {
            if (korisnik.username == username) {
                const isPasswordMatched = await bcrypt.compare(jsonObj.password, korisnik.password);

                if (isPasswordMatched) {
                    req.session.username = korisnik.username;
                    found = true;
                    successfulLogin = true;
          
                    if (loginAttempts[username]) {
                        delete loginAttempts[username];
                    }
                    break;
                }
            }
        }

        if (found && successfulLogin) {
            await logLoginAttempt(username, "uspješno");
            res.json({ poruka: 'Uspješna prijava' });
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
            res.json({ poruka: 'Neuspješna prijava' });
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
app.get('/korisnik', async (req, res) => {
    // Check if the username is present in the session
    if (!req.session.username) {
        // User is not logged in
        return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // User is logged in, fetch additional user data
    const username = req.session.username;

    try {
        // Read user data from the JSON file
        const users = await readJsonFile('korisnici');

        // Find the user by username
        const user = users.find((u) => u.username === username);

        if (!user) {
            // User not found (should not happen if users are correctly managed)
            return res.status(401).json({ greska: 'Neautorizovan pristup' });
        }

        // Send user data
        const userData = {
            id: user.id,
            ime: user.ime,
            prezime: user.prezime,
            username: user.username,
            // password: user.password // Should exclude the password for security reasons - Removed password from response for security
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

const MAX_UPITA_PER_NEKRETNINA = 3;

/*
Allows logged user to make a request for a property
*/
app.post('/upit', async (req, res) => {
    // Check if the user is authenticated
    if (!req.session.username) { // Changed to check for username for consistency and correctness
        // User is not logged in
        return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Get data from the request body
    const { nekretnina_id, tekst_upita } = req.body;
    const username = req.session.username; // Get username from session

    try {
        // Read user data from the JSON file (might not be needed for query limit logic, but kept for user ID)
        const users = await readJsonFile('korisnici');

        // Read properties data from the JSON file
        const nekretnine = await readJsonFile('nekretnine');

        // Find the user by username
        const loggedInUser = users.find((user) => user.username === username);

        if (!loggedInUser) {
            return res.status(401).json({ greska: 'Neautorizovan pristup' }); // User not found, although session exists - should not happen
        }
        const userId = loggedInUser.id;

        // Find the property with nekretnina_id
        const nekretnina = nekretnine.find((property) => property.id === nekretnina_id);

        if (!nekretnina) {
            // Property not found
            return res.status(400).json({ greska: `Nekretnina sa id-em ${nekretnina_id} ne postoji` });
        }

        // Initialize upiti array if it doesn't exist
        if (!nekretnina.upiti) {
            nekretnina.upiti = [];
        }

        // Count existing queries for this user and property
        const userQueryCount = nekretnina.upiti.filter(upit => upit.korisnik_id === userId).length;

        // Check if user has exceeded query limit for this property
        if (userQueryCount >= MAX_UPITA_PER_NEKRETNINA) {
            return res.status(429).json({ greska: "Previse upita za istu nekretninu." });
        }

        // Add a new query to the property's queries array
        nekretnina.upiti.push({
            korisnik_id: userId,
            tekst_upita: tekst_upita
        });

        // Save the updated properties data back to the JSON file
        await saveJsonFile('nekretnine', nekretnine);

        res.status(200).json({ poruka: 'Upit je uspješno dodan' });

    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns all queries for the logged in user.
*/
app.get('/upiti/moji', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    const username = req.session.username;

    try {
        const users = await readJsonFile('korisnici');
        const nekretnine = await readJsonFile('nekretnine');

        const loggedInUser = users.find(user => user.username === username);
        if (!loggedInUser) {
            return res.status(401).json({ greska: 'Neautorizovan pristup' }); 
        }
        const userId = loggedInUser.id;

        let userQueries = [];

        for (const nekretnina of nekretnine) {
            if (nekretnina.upiti && Array.isArray(nekretnina.upiti)) {
                for (const upit of nekretnina.upiti) {
                    if (upit.korisnik_id === userId) {
                        userQueries.push({
                            id_nekretnine: nekretnina.id,
                            tekst_upita: upit.tekst_upita
                        });
                    }
                }
            }
        }

        if (userQueries.length > 0) {
            res.status(200).json(userQueries);
        } else {
            res.status(404).json([]); 
        }

    } catch (error) {
        console.error('Error fetching user queries:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns details for a specific property by ID, with last 3 queries.
*/
app.get('/nekretnina/:id', async (req, res) => {
    const id = parseInt(req.params.id); 

    if (isNaN(id)) {
        return res.status(400).json({ greska: "Nekretnina ID mora biti broj." });
    }

    try {
        const nekretnine = await readJsonFile('nekretnine');
        const nekretnina = nekretnine.find(nekretnina => nekretnina.id === id);

        if (!nekretnina) {
            return res.status(404).json({ greska: `Nekretnina sa id-em ${id} nije pronađena.` });
        }

        let shortenedUpiti = [];
        if (nekretnina.upiti && Array.isArray(nekretnina.upiti)) {
            shortenedUpiti = nekretnina.upiti.slice(-3); 
        }

        const nekretninaResponse = {
            ...nekretnina,
            upiti: shortenedUpiti 
        };



        res.status(200).json(nekretninaResponse);

    } catch (error) {
        console.error('Error fetching property details:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});

/*
Returns next 3 queries for a property based on page number.
*/
app.get('/next/upiti/nekretnina/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page); 

    if (isNaN(id)) {
        return res.status(400).json({ greska: "Nekretnina ID mora biti broj." });
    }
    if (isNaN(page)) {
        return res.status(400).json({ greska: "Page mora biti broj." });
    }
    if (page < 0) {
        return res.status(404).json({ greska: "Page ne moze biti negativan broj." });
    }


    try {
        const nekretnine = await readJsonFile('nekretnine');
        const nekretnina = nekretnine.find(nekretnina => nekretnina.id === id);

        if (!nekretnina) {
            return res.status(404).json({ greska: `Nekretnina sa id-em ${id} nije pronađena.` });
        }

        let upiti = nekretnina.upiti;
        if (!upiti || !Array.isArray(upiti)) {
            return res.status(404).json([]); // No queries found, return 404 with empty array
        }

        const pageSize = 3;
        let nextUpiti = [];

        if (page === 0) {
            nextUpiti = upiti.slice(-pageSize); // Last 3 upita
        } else if (page > 0) {
            const startIndex = Math.max(0, upiti.length - (page * pageSize) - pageSize);
            const endIndex = Math.max(0, upiti.length - (page * pageSize));
            nextUpiti = upiti.slice(startIndex, endIndex);
        } else {
            return res.status(404).json({ greska: "Page ne moze biti negativan broj." }); // Redundant, but for clarity
        }


        if (nextUpiti.length > 0) {
            // Format the response to include only korisnik_id and tekst_upita
            const formattedUpiti = nextUpiti.map(upit => ({
                korisnik_id: upit.korisnik_id,
                tekst_upita: upit.tekst_upita
            }));
            res.status(200).json(formattedUpiti);
        } else {
            res.status(404).json([]); // No more queries for this page, return 404 with empty array
        }


    } catch (error) {
        console.error('Error fetching next queries for property:', error);
        res.status(500).json({ greska: 'Internal Server Error' });
    }
});


/*
Updates any user field
*/
app.put('/korisnik', async (req, res) => {
    // Check if the user is authenticated
    if (!req.session.username) {
        // User is not logged in
        return res.status(401).json({ greska: 'Neautorizovan pristup' });
    }

    // Get data from the request body
    const { ime, prezime, username, password } = req.body;

    try {
        // Read user data from the JSON file
        const users = await readJsonFile('korisnici');

        // Find the user by username
        const loggedInUser = users.find((user) => user.username === req.session.username);

        if (!loggedInUser) {
            // User not found (should not happen if users are correctly managed)
            return res.status(401).json({ greska: 'Neautorizovan pristup' });
        }

        // Update user data with the provided values
        if (ime) loggedInUser.ime = ime;
        if (prezime) loggedInUser.prezime = prezime;
        if (username && username !== loggedInUser.username) { // Check if username is being changed and if it's different
            // Check if the new username already exists
            const usernameExists = users.some(user => user.username === username);
            if (usernameExists) {
                return res.status(400).json({ greska: 'Korisničko ime već postoji.' });
            }
            loggedInUser.username = username;
        }
        if (password) {
            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);
            loggedInUser.password = hashedPassword;
        }

        // Save the updated user data back to the JSON file
        await saveJsonFile('korisnici', users);
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
        const nekretnineData = await readJsonFile('nekretnine');
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
        const nekretnineData = await readJsonFile('nekretnine');

        // Filter properties by location
        const nekretnineLokacija = nekretnineData.filter(nekretnina => nekretnina.lokacija === lokacija);

        if (nekretnineLokacija.length === 0) {
            return res.status(200).json([]); // Return empty array if no properties found for location
        }

        // Sort by date, assuming 'datum_objave' field exists and is in a sortable format (like ISO date string)
        const sortiraneNekretnine = nekretnineLokacija.sort((a, b) => {
            // Assuming datum_objave is in 'YYYY-MM-DD' format, or similar sortable string
            if (a.datum_objave && b.datum_objave) {
                return new Date(b.datum_objave) - new Date(a.datum_objave); // Sort in descending order (newest first)
            } else if (a.datum_objave) {
                return -1; // a has date, b doesn't, a comes first
            } else if (b.datum_objave) {
                return 1;  // b has date, a doesn't, b comes first
            } else {
                return 0;  // Neither has date, keep original order
            }
        });

        // Get top 5
        const top5Nekretnine = sortiraneNekretnine.slice(0, 5);

        res.status(200).json(top5Nekretnine);

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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});