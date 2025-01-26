document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const idNekretnine = urlParams.get('id');

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

});

let trenutniIndeksUpita = 0;
let sviUpitiNekretnine = [];
let brojUpitaPoStranici = 3;
let trenutnaStranicaUpita = 0; 
let imaJosUpitaZaUcitati = true;
let ucitavanjeUpitaUTijeku = false; 


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


    sviUpitiNekretnine = nekretnina.upiti || [];
    prikaziPocetneUpite();

    dohvatiTop5NekretninaPoLokaciji(nekretnina.lokacija);
}

function prikaziPocetneUpite() {
    const carouselUpitiContainer = document.getElementById('carousel-upiti-container');

    if (!sviUpitiNekretnine || sviUpitiNekretnine.length === 0) {
        carouselUpitiContainer.innerHTML = `<p>Trenutno nema upita za ovu nekretninu.</p>`;
        return;
    }

    trenutniIndeksUpita = 0; 
    azurirajCarouselPrikaz();
    postaviNavigacijuCarousela();
}


function azurirajCarouselPrikaz() {
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
    if (sviUpitiNekretnine.length <= brojUpitaPoStranici) {
        setZaPrikaz = sviUpitiNekretnine;
    } else {
        let startIndex = trenutniIndeksUpita;
        setZaPrikaz = sviUpitiNekretnine.slice(startIndex, startIndex + brojUpitaPoStranici);
    }
    trenutniPrikazaniUpitiSet = setZaPrikaz;

    for (let i = 0; i < carouselSlots.length; i++) {
        const slot = carouselSlots[i];
        const upit = setZaPrikaz[i];

        if (slot) {
            if (upit) {
                slot.innerHTML = `
                    <div class="upit-sadrzaj">
                        <p><strong>${upit.korisnik_id}:</strong></p>
                        <p>${upit.tekst_upita}</p>
                    </div>
                `;
            } else {
                slot.innerHTML = '';
            }
        }
    }
}


function postaviNavigacijuCarousela() {
    const dugmeLijevo = document.getElementById("prev");
    const dugmeDesno = document.getElementById("next");

    dugmeLijevo.onclick = function() {
        prethodniUpiti();
    };

    dugmeDesno.onclick = function() {
        sljedeciUpiti();
    };
}


function sljedeciUpiti() {
    if (!sviUpitiNekretnine || sviUpitiNekretnine.length === 0) return;

    trenutniIndeksUpita += brojUpitaPoStranici;

    if (trenutniIndeksUpita >= sviUpitiNekretnine.length && imaJosUpitaZaUcitati && !ucitavanjeUpitaUTijeku) {
        ucitajSljedeceUpite(); 
        return; 
    }

    if (trenutniIndeksUpita >= sviUpitiNekretnine.length) {
        trenutniIndeksUpita = 0; 
    }
    azurirajCarouselPrikaz();
}

function prethodniUpiti() {
    if (!sviUpitiNekretnine || sviUpitiNekretnine.length === 0) return;

    trenutniIndeksUpita -= brojUpitaPoStranici;

    if (trenutniIndeksUpita < 0) {
        trenutniIndeksUpita = Math.max(0, sviUpitiNekretnine.length - brojUpitaPoStranici);
        if (trenutniIndeksUpita < 0) trenutniIndeksUpita = 0;
    }
    azurirajCarouselPrikaz();
}


function ucitajSljedeceUpite() {
    if (ucitavanjeUpitaUTijeku) return; 
    ucitavanjeUpitaUTijeku = true;
    trenutnaStranicaUpita++;


    PoziviAjax.getNextUpiti(getNekretninaIdFromUrl(), trenutnaStranicaUpita, (error, sljedeciUpiti) => {
        ucitavanjeUpitaUTijeku = false; 
        if (error || !sljedeciUpiti || !Array.isArray(sljedeciUpiti) || sljedeciUpiti.length === 0) {
            imaJosUpitaZaUcitati = false; 
            return; 
        }

        sviUpitiNekretnine = sviUpitiNekretnine.concat(sljedeciUpiti);
        azurirajCarouselPrikaz();
    });
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
            console.log("Top 5 nekretnina sa lokacije (niz objekata):", top5Nekretnine);

            if (top5Nekretnine && top5Nekretnine.length > 0) {
                prikaziTop5NekretninaPoLokaciji(top5Nekretnine);
            } else {
                console.log("Nema top 5 nekretnina za ovu lokaciju.");
            }
        }
    });
}



function prikaziTop5NekretninaPoLokaciji(nekretnine) {
    console.log('prikaziTop5NekretninaPoLokaciji called with nekretnine:', nekretnine); 

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