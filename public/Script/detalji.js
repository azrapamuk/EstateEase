document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const idNekretnine = urlParams.get('id');
    const dodajInteresovanjeFormDiv = document.getElementById('dodaj-interesovanje-forma'); // Get the form div

    // Check if user is logged in for form visibility only
    PoziviAjax.getKorisnik( (error, korisnik) => {
        if (error || !korisnik) {
            // User is not logged in, hide the form
            if (dodajInteresovanjeFormDiv) {
                dodajInteresovanjeFormDiv.style.display = 'none';
                console.log("Korisnik nije prijavljen, forma za interesovanje je sakrivena.");
            }
        } else {
            // User is logged in, form will be displayed (default behavior)
            if (dodajInteresovanjeFormDiv) {
                 console.log("Korisnik prijavljen, forma za interesovanje je prikazana.");
            }
        }
    });

    if (idNekretnine) {
        dohvatiDetaljeNekretnine(idNekretnine);
    } else {
        console.error('ID nekretnine nije pronađen u URL-u.');
        prikaziGreskuNaStranici('Nevažeći URL. ID nekretnine nije pronađen.');
    }
    const lokacijaTrigger = document.getElementById('nekretnina-lokacija');
    const top5NekretnineDiv = document.getElementById('top5-nekretnine-lokacija');
    lokacijaTrigger.addEventListener('click', function() {
        if (top5NekretnineDiv.style.display == 'block') {
            top5NekretnineDiv.style.display = 'none';
        } else {
            top5NekretnineDiv.style.display = 'block';
            setTimeout(function() {
                top5NekretnineDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 10);
        }
    });

   const tipInteresovanjaSelect = document.getElementById('tip-interesovanja');
   const zahtjevFieldsDiv = document.getElementById('zahtjev-fields');
   const ponudaFieldsDiv = document.getElementById('ponuda-fields');
   const vezanaPonudaIdSelect = document.getElementById('vezana-ponuda-id');
   const interesovanjeForm = document.getElementById('interesovanje-form');
   const interesovanjePorukaDiv = document.getElementById('interesovanje-poruka');

   function azurirajFormuInteresovanja() {
       const tip = tipInteresovanjaSelect.value;
       zahtjevFieldsDiv.style.display = tip === 'zahtjev' ? 'block' : 'none';
       ponudaFieldsDiv.style.display = tip === 'ponuda' ? 'block' : 'none';

       if (tip === 'ponuda') {
           popuniDropdownVezanihPonuda();
       }
   }

   function popuniDropdownVezanihPonuda() {
       vezanaPonudaIdSelect.innerHTML = `
           <option value="">-- Bez vezane ponude --</option>
           <option value="1">Ponuda ID 1</option>
           <option value="2">Ponuda ID 2</option>
           <option value="3">Ponuda ID 3</option>
       `;
   }

   tipInteresovanjaSelect.addEventListener('change', azurirajFormuInteresovanja);
   azurirajFormuInteresovanja();

   interesovanjeForm.addEventListener('submit', function(event) {
       event.preventDefault();
       interesovanjePorukaDiv.textContent = '';
       const tipInteresovanja = tipInteresovanjaSelect.value;
       const tekst = document.getElementById('interesovanje-tekst').value;
       let data = { tekst: tekst };

       if (tipInteresovanja === 'zahtjev') {
           const trazeniDatum = document.getElementById('trazeni-datum').value;
           if (!trazeniDatum) {
               interesovanjePorukaDiv.textContent = 'Traženi datum je obavezan za zahtjev.';
               return;
           }
           data.trazeniDatum = trazeniDatum;
           posaljiInteresovanjeZahtjev(getNekretninaIdFromUrl(), data);

       } else if (tipInteresovanja === 'ponuda') {
           const ponudaCijene = document.getElementById('ponuda-cijena').value;
           const idVezanePonude = document.getElementById('vezana-ponuda-id').value;

           if (!ponudaCijene) {
               interesovanjePorukaDiv.textContent = 'Cijena ponude je obavezna za ponudu.';
               return;
           }
           data.ponudaCijene = ponudaCijene;
           data.datumPonude = new Date().toISOString().slice(0, 10);
           if (idVezanePonude) {
               data.idVezanePonude = idVezanePonude;
           }
           posaljiInteresovanjePonuda(getNekretninaIdFromUrl(), data);

       } else if (tipInteresovanja === 'upit') {
           posaljiInteresovanjeUpit(getNekretninaIdFromUrl(), tekst);
       }
   });

   function posaljiInteresovanjeUpit(nekretninaId, tekstUpita) {
       PoziviAjax.postUpit(nekretninaId, tekstUpita, (error, response) => {
           if (error) {
               console.error('Greška prilikom kreiranja upita:', error);
               interesovanjePorukaDiv.textContent = 'Greška prilikom kreiranja upita. Pokušajte ponovo.';
           } else {
               interesovanjePorukaDiv.textContent = 'Upit uspješno poslan!';
               interesovanjeForm.reset();
               window.location.reload();
           }
       });
   }

   function posaljiInteresovanjeZahtjev(nekretninaId, zahtjevData) {
    PoziviAjax.postZahtjev(nekretninaId, zahtjevData, (error, response) => {
        if (error && (error.status === 500 || error.status == 404)) { 
            interesovanjePorukaDiv.textContent = 'Greška pri kreiranju zahtjeva. Provjerite da li su sva polja smislena i pokušajte ponovo.'; // More specific message for 500
         }
          else {
            interesovanjePorukaDiv.textContent = 'Zahtjev za pregled uspješno poslan!';
            interesovanjeForm.reset();
            tipInteresovanjaSelect.value = 'zahtjev';
            window.location.reload();
        }
    });
}

   function posaljiInteresovanjePonuda(nekretninaId, ponudaData) {
       PoziviAjax.postPonuda(nekretninaId, ponudaData, (error, response) => {
           if (error && error.status!=201) {
               console.error('Greška prilikom kreiranja ponude:', error);
               interesovanjePorukaDiv.textContent = 'Greška prilikom kreiranja ponude. Pokušajte ponovo.';
           } else {
               interesovanjePorukaDiv.textContent = 'Ponuda uspješno poslana!';
               interesovanjeForm.reset();
               tipInteresovanjaSelect.value = 'ponuda';
               window.location.reload();
           }
       });
   }

    let trenutniIndeksUpita = 0;
    let sviUpitiNekretnine = [];
    let trenutniIndeksPonuda = 0;
    let svePonudeNekretnine = [];
    let trenutniIndeksZahtjev = 0;
    let sviZahtjeviNekretnine = [];
    let brojPrikazanihInteresovanja = 3;

    function dohvatiDetaljeNekretnine(idNekretnine) {
        PoziviAjax.getNekretnina(idNekretnine, (error, nekretninaDetalji) => {
            if (error) {
                console.error('Greška prilikom dohvatanja detalja nekretnine:', error);
                prikaziGreskuNaStranici('Greška prilikom dohvatanja detalja nekretnine. Molimo pokušajte ponovno kasnije.');
            } else {
                popuniStranicuDetaljima(nekretninaDetalji);
            }
        });
    }


    function popuniStranicuDetaljima(nekretnina) {
        document.getElementById('nekretnina-slika').src = `../Resources/${nekretnina.id}.jpg`;
        document.getElementById('nekretnina-slika').alt = nekretnina.naziv;
        document.getElementById('nekretnina-naziv').textContent = nekretnina.naziv;
        document.getElementById('nekretnina-kvadratura').textContent = nekretnina.kvadratura;
        document.getElementById('nekretnina-cijena').textContent = nekretnina.cijena;

        document.getElementById('nekretnina-tip-grijanja').textContent = nekretnina.tip_grijanja || 'N/A';
        document.getElementById('nekretnina-lokacija').textContent = nekretnina.lokacija || 'N/A';
        document.getElementById('nekretnina-godina-izgradnje').textContent = nekretnina.godina_izgradnje || 'N/A';
        document.getElementById('nekretnina-datum-objave').textContent = nekretnina.datum_objave || 'N/A';
        document.getElementById('nekretnina-opis').textContent = nekretnina.opis || 'N/A';

        PoziviAjax.getInteresovanjaNekretnine(nekretnina.id, (error, interesovanja) => {
            if (error) {
                console.error('Greška prilikom dohvatanja svih interesovanja:', error);
                return;
            }

            console.log("Response from PoziviAjax.getInteresovanjaNekretnine:", interesovanja);



        sviUpitiNekretnine = interesovanja.upiti;
        svePonudeNekretnine = interesovanja.ponude;
        sviZahtjeviNekretnine = interesovanja.zahtjevi;

            prikaziPocetneUpite();
            prikaziPocetnePonude();
            prikaziPocetneZahtjeve();
        });

        dohvatiTop5NekretninaPoLokaciji(nekretnina.lokacija);
    }

    // --- UPITI CAROUSEL ---
    function prikaziPocetneUpite() {
        const carouselUpitiContainer = document.getElementById('carousel-upiti-container');
        if (!sviUpitiNekretnine || sviUpitiNekretnine.length === 0) {
            carouselUpitiContainer.innerHTML = `<p>Trenutno nema upita za ovu nekretninu.</p>`;
            return;
        }
        trenutniIndeksUpita = 0;
        azurirajCarouselPrikazUpita();
        postaviNavigacijuCarouselaUpita();
    }

    function azurirajCarouselPrikazUpita() {
        const carouselSlots = [
            document.getElementById('carousel-upit-slot-1'),
            document.getElementById('carousel-upit-slot-2'),
            document.getElementById('carousel-upit-slot-3')
        ];
        const carouselUpitiContainer = document.getElementById('carousel-upiti-container');

        if (!sviUpitiNekretnine || sviUpitiNekretnine.length === 0) {
            carouselUpitiContainer.innerHTML = `<p>Trenutno nema upita za ovu nekretninu.</p>`;
            return;
        }

        let setZaPrikaz = [];
        if (sviUpitiNekretnine.length <= brojPrikazanihInteresovanja) {
            setZaPrikaz = sviUpitiNekretnine;
        } else {
            let startIndex = trenutniIndeksUpita;
            setZaPrikaz = sviUpitiNekretnine.slice(startIndex, startIndex + brojPrikazanihInteresovanja);
        }

        for (let i = 0; i < carouselSlots.length; i++) {
            const slot = carouselSlots[i];
            const upit = setZaPrikaz[i];

            if (slot) {
                if (upit && upit.korisnikId !== undefined && upit.tekst !== undefined) {
                    slot.innerHTML = `
                        <div class="upit-sadrzaj">
                            <p><strong>ID korisnika: ${upit.korisnikId}</strong></p>
                            <p><strong>ID upita: ${upit.id}</strong></p>
                            <p>${upit.tekst}</p>
                        </div>
                    `;
                } else {
                    slot.innerHTML = '';
                }
            }
        }
    }

    function postaviNavigacijuCarouselaUpita() {
        const dugmeLijevo = document.getElementById("upiti").querySelector("#prev");
        const dugmeDesno = document.getElementById("upiti").querySelector("#next");

        dugmeLijevo.onclick = function() {
            prethodniUpiti();
        };
        dugmeDesno.onclick = function() {
            sljedeciUpiti();
        };
    }

    function sljedeciUpiti() {
        if (!sviUpitiNekretnine || sviUpitiNekretnine.length === 0) return;
        trenutniIndeksUpita += brojPrikazanihInteresovanja;
        if (trenutniIndeksUpita >= sviUpitiNekretnine.length) {
            trenutniIndeksUpita = 0;
        }
        azurirajCarouselPrikazUpita();
    }

    function prethodniUpiti() {
        if (!sviUpitiNekretnine || sviUpitiNekretnine.length === 0) return;
        trenutniIndeksUpita -= brojPrikazanihInteresovanja;
        if (trenutniIndeksUpita < 0) {
            trenutniIndeksUpita = Math.max(0, sviUpitiNekretnine.length - brojPrikazanihInteresovanja);
            if (trenutniIndeksUpita < 0) trenutniIndeksUpita = 0;
        }
        azurirajCarouselPrikazUpita();
    }


    // --- PONUDE CAROUSEL ---
    function prikaziPocetnePonude() {
        const carouselPonudeContainer = document.getElementById('carousel-ponude-container');
        if (!svePonudeNekretnine || svePonudeNekretnine.length === 0) {
            carouselPonudeContainer.innerHTML = `<p>Trenutno nema ponuda za ovu nekretninu.</p>`;
            return;
        }
        trenutniIndeksPonuda = 0;
        azurirajCarouselPrikazPonude();
        postaviNavigacijuCarouselaPonude();
    }

    function azurirajCarouselPrikazPonude() {
        const carouselSlots = [
            document.getElementById('carousel-ponuda-slot-1'),
            document.getElementById('carousel-ponuda-slot-2'),
            document.getElementById('carousel-ponuda-slot-3')
        ];
        const carouselPonudeContainer = document.getElementById('carousel-ponude-container');

        if (!svePonudeNekretnine || svePonudeNekretnine.length === 0) {
            carouselPonudeContainer.innerHTML = `<p>Trenutno nema ponuda za ovu nekretninu.</p>`;
            return;
        }

        let setZaPrikaz = [];
        if (svePonudeNekretnine.length <= brojPrikazanihInteresovanja) {
            setZaPrikaz = svePonudeNekretnine;
        } else {
            let startIndex = trenutniIndeksPonuda;
            setZaPrikaz = svePonudeNekretnine.slice(startIndex, startIndex + brojPrikazanihInteresovanja);
        }

        for (let i = 0; i < carouselSlots.length; i++) {
            const slot = carouselSlots[i];
            const ponuda = setZaPrikaz[i];


            if (slot) {
                if (ponuda && ponuda.korisnikId !== undefined && ponuda.cijenaPonude !== undefined) { // Adjust property names as needed
                    slot.innerHTML = `  
                        <div class="ponuda-sadrzaj">
                            <p><strong>Ponuda ID: ${ponuda.id}</strong></p>
                            <p><strong>Korisnik ID: ${ponuda.korisnikId}:</strong></p>
                            <p>Tekst: ${ponuda.tekst}</p>
                            <p>Cijena: ${ponuda.cijenaPonude} BAM</p>
                            <p>Odbijena ponuda: ${ponuda.odbijenaPonuda ? 'Da' : 'Ne'}</p>
                        </div>
                    `;
                }
                else if (ponuda && ponuda.korisnikId !== undefined && ponuda.cijenaPonude === undefined){
                    slot.innerHTML = `  
                    <div class="ponuda-sadrzaj">
                        <p><strong>Ponuda ID: ${ponuda.id}</strong></p>
                        <p><strong>Korisnik ID: ${ponuda.korisnikId}:</strong></p>
                        <p>Tekst: ${ponuda.tekst}</p>
                        <p>Odbijena ponuda: ${ponuda.odbijenaPonuda ? 'Da' : 'Ne'}</p>
                    </div>
                `;
                }
                else {
                    slot.innerHTML = '';
                }
            }
        }
    }

    function postaviNavigacijuCarouselaPonude() {
        const dugmeLijevo = document.getElementById("ponude").querySelector("#prev");
        const dugmeDesno = document.getElementById("ponude").querySelector("#next");

        dugmeLijevo.onclick = function() {
            prethodniPonudi();
        };
        dugmeDesno.onclick = function() {
            sljedeciPonudi();
        };
    }

    function sljedeciPonudi() {
        if (!svePonudeNekretnine || svePonudeNekretnine.length === 0) return;
        trenutniIndeksPonuda += brojPrikazanihInteresovanja;
        if (trenutniIndeksPonuda >= svePonudeNekretnine.length) {
            trenutniIndeksPonuda = 0;
        }
        azurirajCarouselPrikazPonude();
    }

    function prethodniPonudi() {
        if (!svePonudeNekretnine || svePonudeNekretnine.length === 0) return;
        trenutniIndeksPonuda -= brojPrikazanihInteresovanja;
        if (trenutniIndeksPonuda < 0) {
            trenutniIndeksPonuda = Math.max(0, svePonudeNekretnine.length - brojPrikazanihInteresovanja);
            if (trenutniIndeksPonuda < 0) trenutniIndeksPonuda = 0;
        }
        azurirajCarouselPrikazPonude();
    }


    // --- ZAHTJEVI CAROUSEL ---
    function prikaziPocetneZahtjeve() {
        const carouselZahtjeviContainer = document.getElementById('carousel-zahtjevi-container');
        if (!sviZahtjeviNekretnine || sviZahtjeviNekretnine.length === 0) {
            carouselZahtjeviContainer.innerHTML = `<p>Trenutno nema zahtjeva za ovu nekretninu.</p>`;
            return;
        }
        trenutniIndeksZahtjev = 0;
        azurirajCarouselPrikazZahtjeva();
        postaviNavigacijuCarouselaZahtjeva();
    }

    function azurirajCarouselPrikazZahtjeva() {
        const carouselSlots = [
            document.getElementById('carousel-zahtjev-slot-1'),
            document.getElementById('carousel-zahtjev-slot-2'),
            document.getElementById('carousel-zahtjev-slot-3')
        ];
        const carouselZahtjeviContainer = document.getElementById('carousel-zahtjevi-container');

        if (!sviZahtjeviNekretnine || sviZahtjeviNekretnine.length === 0) {
            carouselZahtjeviContainer.innerHTML = `<p>Trenutno nema zahtjeva za ovu nekretninu.</p>`;
            return;
        }

        let setZaPrikaz = [];
        if (sviZahtjeviNekretnine.length <= brojPrikazanihInteresovanja) {
            setZaPrikaz = sviZahtjeviNekretnine;
        } else {
            let startIndex = trenutniIndeksZahtjev;
            setZaPrikaz = sviZahtjeviNekretnine.slice(startIndex, startIndex + brojPrikazanihInteresovanja);
        }

        for (let i = 0; i < carouselSlots.length; i++) {
            const slot = carouselSlots[i];
            const zahtjev = setZaPrikaz[i];

            if (slot) {
                if (zahtjev && zahtjev.korisnikId !== undefined && zahtjev.trazeniDatum !== undefined) { // Adjust property names as needed
                    slot.innerHTML = `
                        <div class="zahtjev-sadrzaj">
                            <p><strong>Zahtjev ID: ${zahtjev.id}</strong></p>
                            <p><strong>Korisnik ID: ${zahtjev.korisnikId}:</strong></p>
                            <p>Tekst: ${zahtjev.tekst}</p>
                            <p>Traženi datum: ${zahtjev.trazeniDatum}</p>
                            <p>Odobren: ${zahtjev.odobren === true ? 'Da' : (zahtjev.odobren === false ? 'Ne' : 'Čeka se odgovor')}</p>
                        </div>
                    `;
                } else {
                    slot.innerHTML = '';
                }
            }
        }
    }

    function postaviNavigacijuCarouselaZahtjeva() {
        const dugmeLijevo = document.getElementById("zahtjevi").querySelector("#prev");
        const dugmeDesno = document.getElementById("zahtjevi").querySelector("#next");

        dugmeLijevo.onclick = function() {
            prethodniZahtjevi();
        };
        dugmeDesno.onclick = function() {
            sljedeciZahtjevi();
        };
    }

    function sljedeciZahtjevi() {
        if (!sviZahtjeviNekretnine || sviZahtjeviNekretnine.length === 0) return;
        trenutniIndeksZahtjev += brojPrikazanihInteresovanja;
        if (trenutniIndeksZahtjev >= sviZahtjeviNekretnine.length) {
            trenutniIndeksZahtjev = 0;
        }
        azurirajCarouselPrikazZahtjeva();
    }

    function prethodniZahtjevi() {
        if (!sviZahtjeviNekretnine || sviZahtjeviNekretnine.length === 0) return;
        trenutniIndeksZahtjev -= brojPrikazanihInteresovanja;
        if (trenutniIndeksZahtjev < 0) {
            trenutniIndeksZahtjev = Math.max(0, sviZahtjeviNekretnine.length - brojPrikazanihInteresovanja);
            if (trenutniIndeksZahtjev < 0) trenutniIndeksZahtjev = 0;
        }
        azurirajCarouselPrikazZahtjeva();
    }


    function getNekretninaIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }


    function prikaziGreskuNaStranici(porukaGreske) {
        const osnovnoDiv = document.getElementById('osnovno');
        osnovnoDiv.innerHTML = `<p class="greska">${porukaGreske}</p>`;
    }

    function dohvatiTop5NekretninaPoLokaciji(lokacija) {
        PoziviAjax.getTop5Nekretnina(lokacija, (error, top5Nekretnine) => {
            if (error) {
                console.error('Greška prilikom dohvatanja top 5 nekretnina:', error);
            } else {
                if (top5Nekretnine && top5Nekretnine.length > 0) {
                    prikaziTop5NekretninaPoLokaciji(top5Nekretnine);
                } else {
                    console.log("Nema top 5 nekretnina za ovu lokaciju.");
                }
            }
        });
    }

    function prikaziTop5NekretninaPoLokaciji(nekretnine) {
        const top5Container = document.getElementById('top5-nekretnine-lokacija');
        if (!top5Container) {
            console.error('Element sa id-em "top5-nekretnine-lokacija" nije pronađen u HTML-u.');
            return;
        }

        if (!nekretnine || nekretnine.length === 0) {
            top5Container.innerHTML = `<p>Nema top 5 nekretnina za ovu lokaciju.</p>`;
            return;
        }

        let html = '<ul>';
        nekretnine.forEach(nekretnina => {
            if (nekretnina.naziv === undefined || nekretnina.lokacija === undefined || nekretnina.cijena === undefined) {
                return;
            }
            html += `
                <li>
                    <a href="detalji.html?id=${nekretnina.id}" class="top5-nekretnina-link">
                        <div class="top5-nekretnina-item">
                            <img src="../Resources/${nekretnina.id}.jpg" alt="${nekretnina.naziv}" class="top5-nekretnina-slika">
                            <div class="top5-nekretnina-info">
                                <h4 class="top5-nekretnina-naziv">${nekretnina.naziv}</h4>
                                <p class="top5-nekretnina-lokacija">${nekretnina.lokacija}</p>
                                <p class="top5-nekretnina-cijena">${nekretnina.cijena} BAM</p>
                            </div>
                        </div>
                    </a>
                </li>
            `;
        });
        html += '</ul>';
        top5Container.innerHTML = html;
    }

    function prikaziPorukuUTop5Divu(poruka) {
        const top5Container = document.getElementById('top5-nekretnine-lokacija');
        if (!top5Container) {
            console.error('Element sa id-em "top5-nekretnine-lokacija" nije pronađen u HTML-u.');
            return;
        }
        top5Container.innerHTML = `<p>${poruka}</p>`;
    }

});
