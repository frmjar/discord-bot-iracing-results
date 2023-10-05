const { Client, GatewayIntentBits, Partials } = require('discord.js');
const csvtojson = require('csvtojson');
const xlsx = require('xlsx');
const env = require('dotenv').config();
const client = new Client({
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds],
  partials: [Partials.Message]
});

// Configura el prefijo de comandos
const prefix = '!';

client.on('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    message = await message.fetch()
  if (!message.author.bot && message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'convertir') {
      if (message.attachments.size === 0) {
        return message.channel.send('Debes adjuntar un archivo JSON para convertirlo a Excel.');
      }

      const attachment = message.attachments.first();

      if (!attachment.name.endsWith('.csv')) {
        return message.channel.send('El archivo adjunto debe ser un CSV.');
      }

      try {
        const response = await fetch(attachment.url);
        
        if (!response.ok) {
          throw new Error('No se pudo descargar el archivo adjunto.');
        }

        try {
            const csv = await response.text();
            
            let csvWithoutFirstLine = csv.substring(csv.indexOf("\n") + 1);
            csvWithoutFirstLine = csvWithoutFirstLine.substring(csvWithoutFirstLine.indexOf("\n") + 2);
           
            const jsonArray = await csvtojson().fromString(csvWithoutFirstLine);

            const resultados = jsonArray.map(element => {
                const {Name, "Fin Pos": finPos, 'Start Pos': startpos, Interval, 'Average Lap Time': avgLapTime, 'Fastest Lap Time': fastestLapTime, Inc, Pts } = element
                return {Nombre: Name, "Posición final": finPos, "Posición inicial": startpos, "Gap": Interval, "Tiempo medio vuelta": avgLapTime, "Vuelta rápida": fastestLapTime, "Incidentes": Inc, "Puntos ganados": Pts}
           })

            const ws = xlsx.utils.json_to_sheet(resultados);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Hoja1');
            
            const columnWidth = resultados.map(row => Object.values(row).map(val => val.toString().length));
            columnWidth.unshift(Object.keys(resultados[0]).map(val => val.length));
            const maxLength = columnWidth.reduce((acc, val) => acc.map((v, i) => Math.max(v, val[i])));
            ws['!cols'] = maxLength.map(len => ({ wch: len }))
           
            xlsx.writeFile(wb, 'resultados.xlsx');
            message.channel.send('Aquí tienes el archivo Excel:')
            message.channel.send({ files: ['resultados.xlsx']});

          } catch (error) {
            console.error('Error al convertir CSV a JSON:', error);
          }

        
      } catch (error) {
        message.channel.send(`Error al convertir el CSV a Excel: ${error.message}`);
        console.log(`Error al convertir el CSV a Excel: ${error}`);
      }
    }

  }
});

export default function handler(request, response) {
  const { name = 'World' } = request.query;
  return response.send(`Hello ${name}!`);
}

// Reemplaza 'TOKEN_DEL_BOT' con el token de tu bot de Discord
client.login(process.env.DISCORD_TOKEN);
