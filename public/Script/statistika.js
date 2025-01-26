const listaNekretnina = [{
    id: 1,
    tip_nekretnine: "Stan",
    naziv: "Useljiv stan Sarajevo",
    kvadratura: 58,
    cijena: 232000,
    tip_grijanja: "plin",
    lokacija: "Novo Sarajevo",
    godina_izgradnje: 2019,
    datum_objave: "01.10.2023.",
    opis: "Sociis natoque penatibus.",
    upiti: [{
        korisnik_id: 1,
        tekst_upita: "Nullam eu pede mollis pretium."
    },
    {
        korisnik_id: 2,
        tekst_upita: "Phasellus viverra nulla."
    }]
},{
    id: 1,
    tip_nekretnine: "Stan",
    naziv: "Useljiv stan Sarajevo",
    kvadratura: 58,
    cijena: 32000,
    tip_grijanja: "plin",
    lokacija: "Novo Sarajevo",
    godina_izgradnje: 2019,
    datum_objave: "01.10.2009.",
    opis: "Sociis natoque penatibus.",
    upiti: [{
        korisnik_id: 1,
        tekst_upita: "Nullam eu pede mollis pretium."
    },
    {
        korisnik_id: 2,
        tekst_upita: "Phasellus viverra nulla."
    }]
},{
    id: 1,
    tip_nekretnine: "Stan",
    naziv: "Useljiv stan Sarajevo",
    kvadratura: 58,
    cijena: 232000,
    tip_grijanja: "plin",
    lokacija: "Novo Sarajevo",
    godina_izgradnje: 2019,
    datum_objave: "01.10.2003.",
    opis: "Sociis natoque penatibus.",
    upiti: [{
        korisnik_id: 1,
        tekst_upita: "Nullam eu pede mollis pretium."
    },
    {
        korisnik_id: 2,
        tekst_upita: "Phasellus viverra nulla."
    }]
},
{
    id: 2,
    tip_nekretnine: "Kuća",
    naziv: "Mali poslovni prostor",
    kvadratura: 20,
    cijena: 70000,
    tip_grijanja: "struja",
    lokacija: "Centar",
    godina_izgradnje: 2005,
    datum_objave: "20.08.2023.",
    opis: "Magnis dis parturient montes.",
    upiti: [{
        korisnik_id: 2,
        tekst_upita: "Integer tincidunt."
    }
    ]
},
{
    id: 3,
    tip_nekretnine: "Kuća",
    naziv: "Mali poslovni prostor",
    kvadratura: 20,
    cijena: 70000,
    tip_grijanja: "struja",
    lokacija: "Centar",
    godina_izgradnje: 2005,
    datum_objave: "20.08.2023.",
    opis: "Magnis dis parturient montes.",
    upiti: [{
        korisnik_id: 2,
        tekst_upita: "Integer tincidunt."
    }
    ]
},
{
    id: 4,
    tip_nekretnine: "Kuća",
    naziv: "Mali poslovni prostor",
    kvadratura: 20,
    cijena: 70000,
    tip_grijanja: "struja",
    lokacija: "Centar",
    godina_izgradnje: 2005,
    datum_objave: "20.08.2023.",
    opis: "Magnis dis parturient montes.",
    upiti: [{
        korisnik_id: 2,
        tekst_upita: "Integer tincidunt."
    }
    ]
}]

const listaKorisnika = [{
    id: 1,
    ime: "Neko",
    prezime: "Nekic",
    username: "username1",
},
{
    id: 2,
    ime: "Neko2",
    prezime: "Nekic2",
    username: "username2",
}]

//instanciranje modula
let nekretnine = StatistikaNekretnina();
nekretnine.init(listaNekretnina, listaKorisnika);

// dodavanje perioda
function dodajPeriod() {
    let div = document.createElement("div");
    div.classList.add("period");
    div.innerHTML = `
        <label><input type="number" class="period-od" placeholder="Od"/></label>
        <label><input type="number" class="period-do" placeholder="Do"/></label>
    `;
    document.getElementById("periodi").appendChild(div);
}

// dodavanje raspona cijena
function dodajRaspon() {
    let div = document.createElement("div");
    div.classList.add("raspon");
    div.innerHTML = `
        <label><input type="number" class="raspon-od" placeholder="Od"/></label>
        <label><input type="number" class="raspon-do" placeholder="Do"/></label>
    `;
    document.getElementById("rasponi").appendChild(div);
}

// histogram
function iscrtajHistogram() {


    let periodi = Array.from(document.querySelectorAll(".period")).map(p => ({
        od: parseInt(p.querySelector(".period-od").value),
        do: parseInt(p.querySelector(".period-do").value)
    }));

    let rasponiCijena = Array.from(document.querySelectorAll(".raspon")).map(r => ({
        od: parseInt(r.querySelector(".raspon-od").value),
        do: parseInt(r.querySelector(".raspon-do").value)
    }));

    if (periodi.some(p => isNaN(p.od) || isNaN(p.do) || p.od > p.do) || rasponiCijena.some(r => isNaN(r.od) || isNaN(r.do) || r.od > r.do || r.od < 0 || r.do < 0)) {
    alert("Molimo unesite validne periode i raspone cijena. 'od' mora biti manje ili jednako 'do', a svi rasponi cijena moraju biti nenegativni.");
    return;
}

    let podaci = nekretnine.histogramCijena(periodi, rasponiCijena);

    document.getElementById("histogrami").style.display="block";

    document.getElementById("histogrami").innerHTML = "<h2>Histogrami</h2>";

    periodi.forEach((period, indeksPerioda) => {
        let canvas = document.createElement("canvas");
        canvas.id = `chart-${indeksPerioda}`;
        document.getElementById("histogrami").appendChild(canvas);

        let data = podaci.filter(d => d.indeksPerioda === indeksPerioda).map(d => d.brojNekretnina);
        let labels = rasponiCijena.map(r => `Raspon ${r.od} - ${r.do}`);

        new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: `Period: ${period.od} - ${period.do}`,
                    data: data,
                    backgroundColor: '#47842c33',
                    borderColor: '#47842c',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    });
}

//prosjecna kvadratura i outlieri
function kvadraturaOutlier() {

    const form = document.getElementById("filter-form");

    const kriteriji = {
        tip_nekretnine: form.querySelector('input[name="tip_nekretnine"]').value.trim(),
        lokacija: form.querySelector('input[name="lokacija"]').value.trim(),
        min_kvadratura: parseInt(form.querySelector('input[name="min_kvadratura"]')?.value) || null,
        max_kvadratura: parseInt(form.querySelector('input[name="max_kvadratura"]')?.value) || null,
        min_cijena: parseInt(form.querySelector('input[name="min_cijena"]').value) || null,
        max_cijena: parseInt(form.querySelector('input[name="max_cijena"]').value) || null,
        min_godina_izgradnje: parseInt(form.querySelector('input[name="min_godina_izgradnje"]').value) || null,
        max_godina_izgradnje: parseInt(form.querySelector('input[name="max_godina_izgradnje"]').value) || null,
        min_datum_objave: form.querySelector('input[name="min_datum_objave"]').value || null,
        max_datum_objave: form.querySelector('input[name="max_datum_objave"]').value || null
    };

    if (kriteriji.min_kvadratura !== null && kriteriji.min_kvadratura < 0) {
        alert("Minimalna kvadratura ne može biti negativna.");
        return false;
    }
    if (kriteriji.max_kvadratura !== null && kriteriji.max_kvadratura < 0) {
        alert("Maksimalna kvadratura ne može biti negativna.");
        return false;
    }
    if (kriteriji.min_cijena !== null && kriteriji.min_cijena < 0) {
        alert("Minimalna cijena ne može biti negativna.");
        return false;
    }
    if (kriteriji.max_cijena !== null && kriteriji.max_cijena < 0) {
        alert("Maksimalna cijena ne može biti negativna.");
        return false;
    }
    if (kriteriji.min_godina_izgradnje !== null && kriteriji.min_godina_izgradnje < 0) {
        alert("Minimalna godina izgradnje ne može biti negativna.");
        return false;
    }
    if (kriteriji.max_godina_izgradnje !== null && kriteriji.max_godina_izgradnje < 0) {
        alert("Maksimalna godina izgradnje ne može biti negativna.");
        return false;
    }

    if (kriteriji.min_kvadratura !== null && kriteriji.max_kvadratura !== null && kriteriji.min_kvadratura > kriteriji.max_kvadratura) {
        alert("Minimalna kvadratura ne može biti veća od maksimalne.");
        return false;
    }
    if (kriteriji.min_cijena !== null && kriteriji.max_cijena !== null && kriteriji.min_cijena > kriteriji.max_cijena) {
        alert("Minimalna cijena ne može biti veća od maksimalne.");
        return false;
    }
    if (kriteriji.min_godina_izgradnje !== null && kriteriji.max_godina_izgradnje !== null && kriteriji.min_godina_izgradnje > kriteriji.max_godina_izgradnje) {
        alert("Minimalna godina izgradnje ne može biti veća od maksimalne.");
        return false;
    }
    if (kriteriji.min_datum_objave && kriteriji.max_datum_objave) {
        const minDatum = new Date(kriteriji.min_datum_objave);
        const maxDatum = new Date(kriteriji.max_datum_objave);
        if (minDatum > maxDatum) {
            alert("Minimalni datum objave ne može biti kasniji od maksimalnog.");
            return false;
        }
    }
   
    const odabraniKriteriji = Object.entries(kriteriji).reduce((acc, [key, value]) => {
        if (value !== null && value !== "") {
            acc[key] = value;
        }
        return acc;
    }, {});

    let rezultatDiv = document.getElementById("rezultati");

    let prosjecnaKvadraturaRezultat = nekretnine.prosjecnaKvadratura(kriteriji);
    if (prosjecnaKvadraturaRezultat == 0){
        rezultatDiv.innerHTML = "Nema nekretnina koje zadovoljavaju odabrane kriterije"
    }
    else{

        rezultatDiv.innerHTML = `
            <strong><p>Prosječna kvadratura:</strong> ${prosjecnaKvadraturaRezultat} m&sup2</p>
            <strong><h3>Outliers:</h3></strong>
        `;
        let numerickiAtributi = ["kvadratura", "cijena", "godina_izgradnje"];
    
        let prikazNaziva = {
            kvadratura: "Kvadratura",
            cijena: "Cijena",
            godina_izgradnje: "Godina izgradnje"
        };
        
        let rezultati = numerickiAtributi.map((atribut) => {
            let outlierRezultat = nekretnine.outlier(kriteriji, atribut);
        
            return `
                <p>
                    <strong>${prikazNaziva[atribut]}:</strong><br>
                    ${outlierRezultat
                        ? `Nekretnina sa najvećim odstupanjem:<br>
                           Naziv: ${outlierRezultat.naziv}<br>
                           Vrijednost: ${outlierRezultat[atribut]}<br>
                           Odstupanje: ${outlierRezultat.odstupanje.toFixed(2)}`
                        : 'Nema outliera'}
                </p>
            `;
        });
        
        rezultatDiv.innerHTML += rezultati.join('');
        
    }

}

//resetovanje forme
function resetFilter(){
    document.getElementById("filter-form").reset();
}

//nekretnine s upitima
function ucitajMojeNekretnine(){

    let korisnikId = document.getElementById('korisnik-id').value;

    if (!korisnikId) {
        alert("Molimo unesite ID korisnika!");
        return;
    }

    let korisnik = { id: parseInt(korisnikId) };
    
    let nekretnineUpiti = nekretnine.mojeNekretnine(korisnik);

    let div = document.getElementById('nekretnine-container');
    div.innerHTML = "";  

    if (nekretnineUpiti.length == 0){
        let p = document.createElement('p');
        p.textContent = `Korisnik sa tim ID-jem nema upita`;
        div.appendChild(p);
    }

    nekretnineUpiti.forEach(function(nekretnina) {
        let p = document.createElement('p');
        p.textContent = `Nekretnina: ${nekretnina.naziv}, Broj upita: ${nekretnina.upiti.length}`;
        div.appendChild(p);
    });
}

