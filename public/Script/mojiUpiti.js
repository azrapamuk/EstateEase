document.addEventListener('DOMContentLoaded', function() {
    dohvatiMojeUpite();
});

function dohvatiMojeUpite() {
    PoziviAjax.getMojiUpiti((error, upiti) => {
        if (error) {
            console.error('Greška prilikom dohvatanja mojih upita:', error);
            prikaziGreskuNaStranici('Greška prilikom dohvatanja upita. Molimo pokušajte ponovo kasnije.');
        } else {
            console.log("Moji upiti dohvaćeni:", upiti);
            prikaziUpite(upiti);
        }
    });
}

function prikaziUpite(upiti) {
    const upitiListaDiv = document.getElementById('upiti-lista');
    upitiListaDiv.innerHTML = ''; 

    if (!upiti || upiti.length === 0) {
        upitiListaDiv.innerHTML = '<p>Trenutno nemate upita.</p>';
        return;
    }

    const lista = document.createElement('ul');
    upiti.forEach(upit => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>Nekretnina ID:</strong> ${upit.id_nekretnine}<br>
            <strong>Tekst upita:</strong> ${upit.tekst_upita}
        `;
        lista.appendChild(listItem);
    });
    upitiListaDiv.appendChild(lista);
}

function prikaziGreskuNaStranici(porukaGreske) {
    const upitiListaDiv = document.getElementById('upiti-lista');
    upitiListaDiv.innerHTML = `<p class="greska">${porukaGreske}</p>`;
}