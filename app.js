console.log("The bot is starting");

var Twit = require("twit");

var mysql = require('mysql');

var config = require("./config");

var FileReader = require("filereader");


var T = new Twit(config);

var pdfcrowd = require("pdfcrowd");

// create the API client instance
var client = new pdfcrowd.HtmlToImageClient("demo", "ce544b6ea52a5621fb9d55f8b542d14d");

// configure the conversion
try {
    client.setOutputFormat("jpg");
} catch(why) {
    console.error("Pdfcrowd Error: " + why);
    console.error("Pdfcrowd Error Code: " + why.getCode());
    console.error("Pdfcrowd Error Message: " + why.getMessage());
    process.exit(1);
}

// run the conversion and write the result to a file


var con = mysql.createConnection({
  database:'twitterBot',
  host: "localhost",
  user: "root",
  password: "password"
});

const selectAllFighterAlive = "select * from fighters";

const countFighterAlive = "select count(*) from fighters";

const deleteFighter = "DELETE FROM fighters WHERE nombreReal = ?";

let totalPlayers = [];

let muertos = []

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");

  select(selectAllFighterAlive).then(function(total){totalPlayers = total});


  let jugar = setInterval(function() {
    select(countFighterAlive).then(function(total) {
        select(selectAllFighterAlive).then(function(valores) {
            let totalVivos  = total[0]['count(*)'];
            getBothPlayers(valores,totalVivos).then(function(jugada) {

                if(totalVivos==2){
                    var tweetGanador = tweetWar("Enhorabuena " + jugada.asesino +" ha ganado!",'','');
                   
                    clearInterval(jugar);
                    
                } 
                const wayToKill = asesinatos(); 
                let forma = wayToKill[Math.floor(Math.random() * wayToKill.length)];
                var tweet = tweetWar(jugada.asesino,forma,jugada.asesinado,"Quedan "+ (totalVivos-1)+ " personajes vivos");
                
                postCallImage(tweet);
                console.log(tweet);
                if(tweetGanador!=undefined){
                    postCallImage(tweetGanador);
                    console.log(tweetGanador)
                }
              })

            }) 
      });

  },1000*60*60)
  
  

});




function getBothPlayers(jugadores,totalVivos){
    return new Promise(function (resolve,reject){
    const numAsesino = Math.floor(Math.random() * totalVivos)+0;
    const numAsesinado = Math.floor(Math.random() * (totalVivos-1));
    
    var asesino = jugadores[numAsesino].nombreReal;
    
    jugadores.splice(numAsesino,1);

    var asesinado = jugadores[numAsesinado].nombreReal

    muertos.push(asesinado);
    deleteValue(deleteFighter,asesinado);
    
    let html = createHTML(totalPlayers);

    let result = createImage(html,asesinado,asesino);
    
    resolve(result);

    })
    
}


async function select(sql) {
    return new Promise(function (resolve,reject){
        con.query(sql,function(err,results){
            resolve(results);
        })
    })
}

function deleteValue(sql,dele) {
    con.query(sql,dele,function(err,results){});
  }


function asesinatos(){
    let formas = ["ha mutilado a","ha apuñalado a","ha quemado a","ha aplastado a","ha disparado a ","ha lanzado al río a"];
    let pruenas =["prueba","prueba","prueba","prueba","prueba ","prueba"];
    return pruenas;
}



function tweetWar(asesino,mensajeDeMuerte,asesinado,final){
    let dataCall = {
        status : asesino + " " + mensajeDeMuerte + " " + asesinado
    }
    if(final!=undefined){
       dataCall.status += ". " +final;
    }

    
    dataCall.status.trim();

    return dataCall;
   

}



function getAllUsers(data){
    data.forEach(element => {
        console.log("USER", element.user.name);
    });
}

function postCall(dataCall){
    T.post('statuses/update', dataCall,function(err,data,response){});
};


function postCallImage(dataCall){
    var data = require('fs').readFileSync('image.jpg' , {encoding : 'base64'})
    //console.log(data);
    T.post('media/upload', {"media": data}, function (err,data,response){
        if(err){
            console.log("Ha habido un error")
            console.log(err)
        } else {
            console.log("Se ha realizado correctamente")
            //console.log(data);
            if(data.media_id_string != undefined){
                dataCall.media_ids = data.media_id_string
                postCall(dataCall)
            }
            //getAllUsers(data);
        }
    });
};
function createImage(html,asesinado,asesino){
    return new Promise(function (resolve,reject){
        client.convertStringToFile(
            html,
            "image.jpg",
            function(err, fileName) {
                if (err) return console.error("Pdfcrowd Error: " + err);
                console.log("Success: the file was created " + fileName);
                let jugada = {
                    'asesino' : asesino,
                    'asesinado' : asesinado
                }
                resolve(jugada);
            });
    });
}

function createHTML(allPlayers){
    let html = "<html><body><ul>";
    allPlayers.forEach(todos => {
        let death = false;
        muertos.forEach(muerto => {
            if(muerto == todos.nombreReal ){
                death = true;
            }
        });
        var li = "<li>"+todos.nombreReal+"</li>"
        if(death){
            var li = "<li style='background-color:red'>"+todos.nombreReal+"</li>"
        }
        
        html += li;
    });
    html +="</ul></body></html>"
    return html;
}
