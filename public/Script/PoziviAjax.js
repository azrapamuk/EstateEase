const PoziviAjax = (() => {

    // fnCallback se u svim metodama poziva kada stigne
    // odgovor sa servera putem Ajax-a
    // svaki callback kao parametre ima error i data,
    // error je null ako je status 200 i data je tijelo odgovora
    // ako postoji greška, poruka se prosljeđuje u error parametru
    // callback-a, a data je tada null

    function ajaxRequest(method, url, data, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    callback(null, xhr.responseText);
                } else {
                    callback({ status: xhr.status, statusText: xhr.statusText, response: xhr.responseText }, null);
                }
            }
        };
        xhr.send(data ? JSON.stringify(data) : null);
    }

    function impl_getKorisnik(fnCallback) {
        function callbackWrapper(err, response) { 
            if (err) {
                fnCallback(err, null);
                return;
            }

            try {
                const parsedData = JSON.parse(response);
                fnCallback(null, parsedData);
            } catch (parseError) {
                console.error("Greška pri parsiranju JSON-a u impl_getKorisnik:", parseError);
                console.error("Originalni odgovor (neparsiran):", response); 
                fnCallback(parseError, null); 
            }
        }

        ajaxRequest('GET', '/korisnik', null, callbackWrapper); 
    }

    function impl_putKorisnik(noviPodaci, fnCallback) {
        ajaxRequest('PUT', '/korisnik', noviPodaci, fnCallback);
    }


    function impl_postUpit(nekretnina_id, tekst_upita, fnCallback) {
        const data = {
            nekretnina_id: nekretnina_id,
            tekst_upita: tekst_upita
        };
        ajaxRequest('POST', '/upit', data, fnCallback);
    }

    function impl_getNekretnine(fnCallback) {
        function callbackWrapper(err, response) { 
            if (err) {
                fnCallback(err, null);
                return;
            }

            try {
                const parsedData = JSON.parse(response);
                fnCallback(null, parsedData);
            } catch (parseError) {
                console.error("Greška pri parsiranju JSON-a u impl_getNekretnine:", parseError);
                console.error("Originalni odgovor (neparsiran):", response); 
                fnCallback(parseError, null); 
            }
        }

        ajaxRequest('GET', '/nekretnine', null, callbackWrapper); 
    }

    function impl_postLogin(username, password, fnCallback) {
        const data = {
            username: username,
            password: password
        };
        ajaxRequest('POST', '/login', data, fnCallback);
    }

    function impl_postLogout(fnCallback) {
        ajaxRequest('POST', '/logout', null, fnCallback);
    }

    function impl_getTop5Nekretnina(lokacija, fnCallback) {
        function callbackWrapper(err, response) {
            if (err) {
                fnCallback(err, null);
                return;
            }

            try {
                const top5Nekretnine = JSON.parse(response);

                fnCallback(null, top5Nekretnine);

            } catch (parseError) {
                console.error("Greška pri parsiranju JSON-a u impl_getTop5Nekretnina:", parseError);
                console.error("Originalni odgovor (neparsiran):", response);
                fnCallback(parseError, null);
            }
        }
        ajaxRequest('GET', `/nekretnine/top5?lokacija=${lokacija}`, null, callbackWrapper);
    }
    
    function impl_getMojiUpiti(fnCallback) {
        function callbackWrapper(err, response) { 
            if (err) {
                fnCallback(err, null);
                return;
            }

            try {
                const parsedData = JSON.parse(response);
                fnCallback(null, parsedData);
            } catch (parseError) {
                console.error("Greška pri parsiranju JSON-a u impl_getMojiUpiti:", parseError);
                console.error("Originalni odgovor (neparsiran):", response);
                fnCallback(parseError, null); 
            }
        }
        ajaxRequest('GET', `/upiti/moji`, null, callbackWrapper);
    }

    function impl_getNekretnina(nekretnina_id, fnCallback) {
        function callbackWrapper(err, response) { 
            if (err) {
                fnCallback(err, null);
                return;
            }

            try {
                const parsedData = JSON.parse(response);
                fnCallback(null, parsedData); 
            } catch (parseError) {
                console.error("Greška pri parsiranju JSON-a u impl_getNekretnina:", parseError);
                console.error("Originalni odgovor (neparsiran):", response);
                fnCallback(parseError, null);
            }
        }
        ajaxRequest('GET', `/nekretnina/${nekretnina_id}`, null, callbackWrapper); 
    }

    function impl_getNextUpiti(nekretnina_id, page, fnCallback) {
        function callbackWrapper(err, response) { 
            if (err) {
                fnCallback(err, null);
                return;
            }

            try {
                const parsedData = JSON.parse(response);
                fnCallback(null, parsedData); 
            } catch (parseError) {
                console.error("Greška pri parsiranju JSON-a u impl_getNextUpiti:", parseError);
                console.error("Originalni odgovor (neparsiran):", response);
                fnCallback(parseError, null); 
            }
        }
        ajaxRequest('GET', `/next/upiti/nekretnina/${nekretnina_id}?page=${page}`, null, callbackWrapper); 
    }

    return {
        postLogin: impl_postLogin,
        postLogout: impl_postLogout,
        getKorisnik: impl_getKorisnik,
        putKorisnik: impl_putKorisnik,
        postUpit: impl_postUpit,
        getNekretnine: impl_getNekretnine,
        getTop5Nekretnina: impl_getTop5Nekretnina,
        getMojiUpiti: impl_getMojiUpiti,
        getNekretnina: impl_getNekretnina,
        getNextUpiti: impl_getNextUpiti
    };
})();

