document.addEventListener("DOMContentLoaded", () => {
    const glavniElement = document.querySelector("#upiti .upit:first-child"); 
    const sviElementi = Array.from(document.querySelectorAll("#upiti .upit")); 
    const dugmeLijevo = document.getElementById("prev");
    const dugmeDesno = document.getElementById("next");

    const carousel = postaviCarousel(glavniElement, sviElementi);

    if (carousel) {
        dugmeLijevo.addEventListener("click", carousel.fnLijevo);
        dugmeDesno.addEventListener("click", carousel.fnDesno);
    }
});
