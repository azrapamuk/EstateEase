let StatistikaNekretnina = function () {

    let modul = SpisakNekretnina();
    
    let init = function (listaNekretnina, listaKorisnika) {
        modul.init(listaNekretnina, listaKorisnika);
    };

    let prosjecnaKvadratura = function (kriterij) {
        let filtrirane = modul.filtrirajNekretnine(kriterij);
        if (filtrirane.length === 0) return 0;
        let sumaKvadratura = filtrirane.reduce((acc, nekretnina) => acc + nekretnina.kvadratura, 0);
        return sumaKvadratura / filtrirane.length;
    };

    let outlier = function (kriterij, nazivSvojstva) {

        let sveNekretnine = modul.listaNekretnina; 
    
        let prosjek = sveNekretnine.reduce((acc, nekretnina) => acc + nekretnina[nazivSvojstva], 0) / sveNekretnine.length;
    
        let filtrirane = modul.filtrirajNekretnine(kriterij);
        if (filtrirane.length === 0) return null;
    
        return filtrirane.reduce((najveciOutlier, nekretnina) => {
            let odstupanje = Math.abs(nekretnina[nazivSvojstva] - prosjek);
            return (!najveciOutlier || odstupanje > najveciOutlier.odstupanje)
                ? { ...nekretnina, odstupanje }
                : najveciOutlier;
        }, null);
    };

    let mojeNekretnine = function (korisnik) {
        let nekretnineSaUpitima = modul.listaNekretnina.filter(nekretnina => 
            nekretnina.upiti && nekretnina.upiti.some(upit => upit.korisnik_id === korisnik.id)
        );
        return nekretnineSaUpitima.sort((a, b) => b.upiti.length - a.upiti.length);
    };

    let histogramCijena = function (periodi, rasponiCijena) {
        let rezultat = [];
        periodi.forEach((period, indeksPerioda) => {
            let filtriranePoPeriodu = modul.listaNekretnina.filter(nekretnina => 
                nekretnina.datum_objave.split('.')[2] >= period.od && nekretnina.datum_objave.split('.')[2] <= period.do
            );
            rasponiCijena.forEach((raspon, indeksRasponaCijena) => {
                let brojNekretnina = filtriranePoPeriodu.filter(nekretnina => 
                    nekretnina.cijena >= raspon.od && nekretnina.cijena <= raspon.do
                ).length;
                rezultat.push({
                    indeksPerioda: indeksPerioda,
                    indeksRasponaCijena: indeksRasponaCijena,
                    brojNekretnina: brojNekretnina
                });
            });
        });
        return rezultat;
    };

    return {
        init: init,
        prosjecnaKvadratura: prosjecnaKvadratura,
        outlier: outlier,
        mojeNekretnine: mojeNekretnine,
        histogramCijena: histogramCijena
    };
};
