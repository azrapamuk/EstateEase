let SpisakNekretnina = function () {
    //privatni atributi modula
    let listaNekretnina = [];
    let listaKorisnika = [];


    //implementacija metoda
    let init = function (listaNekretnina, listaKorisnika) {
        this.listaNekretnina = listaNekretnina;
        this.listaKorisnika = listaKorisnika;
    }

    let filtrirajNekretnine = function (kriterij) {
        return this.listaNekretnina.filter(nekretnina => {
            // Filtriranje po tipu nekretnine
            if (kriterij.tip_nekretnine && nekretnina.tip_nekretnine !== kriterij.tip_nekretnine) {
                return false;
            }

            // Filtriranje po lokaciji
            if (kriterij.lokacija && nekretnina.lokacija !== kriterij.lokacija) {
                return false;
            }

            // Filtriranje po minimalnoj kvadraturi
            if (kriterij.min_kvadratura && nekretnina.kvadratura < kriterij.min_kvadratura) {
                return false;
            }

            // Filtriranje po maksimalnoj kvadraturi
            if (kriterij.max_kvadratura && nekretnina.kvadratura > kriterij.max_kvadratura) {
                return false;
            }

            // Filtriranje po minimalnoj cijeni
            if (kriterij.min_cijena && nekretnina.cijena < kriterij.min_cijena) {
                return false;
            }

            // Filtriranje po maksimalnoj cijeni
            if (kriterij.max_cijena && nekretnina.cijena > kriterij.max_cijena) {
                return false;
            }

            // Filtriranje minimalnoj godini izgradnje
            if (kriterij.min_godina_izgradnje && nekretnina.godina_izgradnje < kriterij.min_godina_izgradnje) {
                return false;
            }

            // Filtriranje po maksimalnoj godini izgradnje
            if (kriterij.max_godina_izgradnje && nekretnina.godina_izgradnje > kriterij.max_godina_izgradnje) {
                return false;
            }

            // Filtriranje minimalnim datumom objave
            if (kriterij.min_datum_objave && new Date(nekretnina.datum_objave) < new Date(kriterij.min_datum_objave)) {
                return false;
            }

            // Filtriranje po maksimalnom datumu objave
            if (kriterij.max_datum_objave && new Date(nekretnina.datum_objave) > new Date(kriterij.max_datum_objave)) {
                return false;
            }

            return true;
        });
    }

    let ucitajDetaljeNekretnine = function (id) {
        return listaNekretnina.find(nekretnina => nekretnina.id === id) || null;
    }


    return {
        init: init,
        filtrirajNekretnine: filtrirajNekretnine,
        ucitajDetaljeNekretnine: ucitajDetaljeNekretnine
    }
};