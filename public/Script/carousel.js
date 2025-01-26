function postaviCarousel(glavniElement, sviElementi, indeks = 0) {
    if (!glavniElement || !Array.isArray(sviElementi) || sviElementi.length === 0 || indeks < 0 || indeks >= sviElementi.length) {
        return null;
    }

    const sviElementiKopije = sviElementi.map(el => {
        const username = el.querySelector("strong") ? el.querySelector("strong").textContent : '';
        const tekst = el.querySelectorAll("p")[1] ? el.querySelectorAll("p")[1].textContent : ''; 
        return { username, tekst }; 
    });

    const azurirajPrikaz = () => {
        const trenutniElement = sviElementiKopije[indeks];

        glavniElement.innerHTML = `
            <p><strong>${trenutniElement.username}</strong></p>
            <p>${trenutniElement.tekst}</p>
        `;
    };

    const fnLijevo = () => {
        indeks = (indeks === 0) ? sviElementiKopije.length - 1 : indeks - 1;
        azurirajPrikaz();
    };

    const fnDesno = () => {
        indeks = (indeks + 1) % sviElementiKopije.length;
        azurirajPrikaz();
    };

    azurirajPrikaz();
    return { fnLijevo, fnDesno };
}
