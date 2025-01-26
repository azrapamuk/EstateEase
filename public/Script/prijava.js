window.onload =function(){
    var username=document.getElementById("username")
    var password=document.getElementById("password")

    let dugme=document.getElementById("dugme")

    dugme.onclick = function(){

        PoziviAjax.postLogin(username.value,password.value,function(err,data){
            if(err != null){
                // Provjera statusa 429 i specifične poruke za blokiranje
                if (err.status === 429 && err.response && JSON.parse(err.response).greska === "Previse neuspjesnih pokusaja. Pokusajte ponovo za 1 minutu.") {
                    window.alert("Previse neuspjesnih pokusaja. Pokusajte ponovo za 1 minutu.");
                } else {
                    // Za ostale greške (ili ako specifična poruka nije pronađena), prikaži generički alert
                    window.alert("Greška prilikom prijave: " + err.statusText); // Ili err.response ako želiš detaljniji odgovor
                }
            }else{
                var message=JSON.parse(data)
                if(message.poruka=="Neuspješna prijava"){
                    var divElement=document.getElementById("areaBelow")
                    divElement.innerHTML="<h2>Neispravni podaci</h2>"
                }else{
                    window.location.href="http://localhost:3000/nekretnine.html"
                }
            }
        })
    }
}