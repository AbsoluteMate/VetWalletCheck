const express = require("express");
var moment = require('moment');
const axios = require('axios');
const app = express();
const fs = require('fs');
var generator = require('generate-password');

//VECHAIN
const { Framework } = require ('@vechain/connex-framework')
const { Driver, SimpleNet, SimpleWallet  } = require ('@vechain/connex-driver')
const abi = [{"inputs":[{"internalType":"address","name":"creator","type":"address"},{"internalType":"uint256","name":"offset","type":"uint256"},{"internalType":"uint256","name":"pageSize","type":"uint256"}],"name":"getListingsForAddress","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"uint256","name":"offset","type":"uint256"},{"internalType":"uint256","name":"pageSize","type":"uint256"}],"name":"getUnlistedTokens","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"}];
function getFunctionABI(funcName) {
    return abi.find((elem) => {
        return elem.type === 'function' && elem.name === funcName;
    })
}


//database
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ Data: []}).write()
const {Client,Intents,MessageEmbed} = require('discord.js');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});
let mainguild;
let rawdata = fs.readFileSync('roles.json');
let obj_roles = JSON.parse(rawdata);
const roles_req = Object.keys(obj_roles).map(Number);

var roles_role_id = [];
Object.entries(obj_roles).forEach(entry => {
  const [key, value] = entry;
  roles_role_id.push(value.role_id)
});
function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}
async function getClosestValue(myArray, myValue){
    var i = 0;
    while(myArray[++i] <= myValue);
    return myArray[--i];
}

const talkedRecently = new Set();
function preventspam(msg){
  if (talkedRecently.has(msg.author.id)) {
    msg.reply("Wait before executing another command " + "<@"+msg.author.id+">.");
    return true;
  } else {
    talkedRecently.add(msg.author.id);
    setTimeout(() => {
      talkedRecently.delete(msg.author.id);
    }, 3000);
    return false;
  }
}

async function gen_password(){
	 	let pw = await generator.generate({length: 10,numbers: true});
		return pw;
}

const passwordtemp = new Object();

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function checkpassword(pass) {
  if (passwordtemp[pass]) {
    return true;
  } else {
    return false;
  }
}

async function createpassword(discordid) {
    let pw = await gen_password();
    passwordtemp[pw] = discordid
    setTimeout(() => {
      delete passwordtemp[pw];
    }, 120*1000);
    return pw;
}

app.get('/wallet/check/:pw',async (req, res) => {
  let checkpw = await checkpassword(req.params.pw)
  if(!checkpw) return  res.json({ status: '404', message: "code not valid" });
  res.json({ status: '200' });
  return;
});



app.get('/load/vet/account/:pw/:addr',async (req, res) => {
  if(checkpassword(req.params.pw)){
    let varrrr = await getnftlist(req.params.addr);
    if(varrrr == 500) return res.json({ status: '500',message:"Api error, contact a staff or try later"});
    if(varrrr.length == 0) return res.json({ status: '500',message:"You dont have any Metaversials Nft"});
    let discord_id = passwordtemp[req.params.pw]
    let seach_array = roles_req;
    let i =  await getClosestValue(seach_array,varrrr.length)
    console.log(roles_req)
    console.log(varrrr.length)
    console.log(i)
    await mainguild.roles.fetch()
    await roles_role_id.forEach(async item => {
      if(obj_roles[i].role_id != item){
        const member = await mainguild.members.fetch(discord_id)
        member.roles.remove(item);
      }
    })
    const member = await mainguild.members.fetch(discord_id)
    member.roles.add(obj_roles[i].role_id);
    var exist = await db.get('Data').find({ Discord_id:discord_id}).value()
    let dt = new Date();
    let date_now = `${
    (dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`
    if(exist){
      db.get('Data').find({ Discord_id:discord_id}).assign({address: req.params.addr,update_date: date_now}).value();
      db.write()
    }else{
      db.get('Data')
        .push({ Discord_id: discord_id, address: req.params.addr, creation_date: date_now })
        .write()
    }
        delete passwordtemp[req.params.pw];
        logging(discord_id,req.params.addr,varrrr.length)
        res.json({ status: '200',message:"Wallet address binded, check your discord roles", meta_nft_count:varrrr.length });
  }else{
    return res.json({ status: '500',message:"Code not valid or expired"});
  }


});


app.listen(3000);



client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(client.guilds.cache.map(guild => guild.name).join(", \n"));
  mainguild = await client.guilds.cache.get('903017805883002891')
});


client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.type == "dm") return;
  let prefix = "!";
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  let args = messageArray.slice(1);

  if (cmd === `${prefix}flex`) {
    let spam = await preventspam(message);
    if(spam) return;
    var exist = await db.get('Data').find({ Discord_id:message.author.id}).value()
    if(!exist) return message.reply("You dont have a wallet connected")
    let nft_list = await getnftlist(exist.address);
    if(!nft_list.includes(args[0])) return message.reply("You dont have that metaversials nft")
    await axios.get('https://vnft-tools.xyz/api/nfts.json?collection=metaversials&nativeId[]='+args[0]+'&pagination=false')
      .then(async res => {
        const msgenter = new MessageEmbed()
          .setColor('#0099ff')
          .setDescription("**"+res.data[0].name+"**\n [Link](https://www.vesea.io/assets?collection=metaversials&id="+res.data[0].nativeId+")")
          .addFields(
          { name: 'Rank:', value: res.data[0].rank.toString(), inline: true },
          )
          .setImage(res.data[0].imageUrl)
          .setFooter({text: 'Collection: Metaversials'});
        await message.reply({
          embeds: [msgenter]
        })
      })
      .catch(error => {
        console.error(error)
      })
  }

  if (cmd === `${prefix}reg`) {
    let spam = await preventspam(message);
    if(spam) return;
    if (message.channel.id != "951866220745990174") return;
    if(!args[0] || args[0].length != 42){
      return message.reply("Address not invalid use !reg walletAddress")
    }
    var exist_wallet = await db.get('Data').find({ address:args[0]}).value()
    if(exist_wallet && exist_wallet.Discord_id != message.author.id){
      const msgenter = new MessageEmbed()
        .setColor('#0099ff')
        .setDescription("These wallet is already registered to a user")
        .setFooter({text: ''});
      await message.reply({
        embeds: [msgenter]
      })
      return;
    }
    let varrrr = await getnftlist(args[0]);
    if(varrrr == 500) return message.reply("An error has occurred, address not valid")
    if(varrrr.length == 0)   return message.reply("You dont have any Metaversials Nft")
    let discord_id = message.author.id;
    let seach_array = roles_req;
    let i = await getClosestValue(seach_array,varrrr.length);
    await mainguild.roles.fetch()
    await roles_role_id.forEach(async item => {
      if(obj_roles[i].role_id != item){
        const member = await mainguild.members.fetch(discord_id)
        member.roles.remove(item);
      }
    })
    const member = await mainguild.members.fetch(discord_id)
    member.roles.add(obj_roles[i].role_id);
    var exist = await db.get('Data').find({ Discord_id:discord_id}).value()
    let dt = new Date();
    let date_now = `${
    (dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear().toString().padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`

    if(exist){
      db.get('Data').find({ Discord_id:discord_id}).assign({address: args[0],update_date: date_now}).value();
      db.write()
      const msgenter = new MessageEmbed()
        .setColor('#0099ff')
        .setDescription("Wallet updated, now you are a <@&"+obj_roles[i].role_id+">")
        .setFooter({text: ''});
      await message.reply({
        embeds: [msgenter]
      })
    }else{
      db.get('Data')
        .push({ Discord_id: discord_id, address: args[0], creation_date: date_now })
        .write()
        const msgenter = new MessageEmbed()
          .setColor('#0099ff')
          .setDescription("Wallet connected, now you are a <@&"+obj_roles[i].role_id+">")
          .setFooter({text: ''});
        await message.reply({
          embeds: [msgenter]
        })
    }
  }


  if (cmd === `${prefix}wallet`) {
    let spam = await preventspam(message);
    if(spam) return;
    var exist = await db.get('Data').find({ Discord_id:message.author.id}).value()
    if(!exist) return message.reply("You dont have a wallet connected")
    let nft_list = await getnftlist(exist.address);
    if(nft_list.length == 0) return message.reply("You dont have any metaversials nft")
    let temp ="";
    let count = 0;
    nft_list.forEach( i=> {
      count ++;
      if(count == nft_list.length){
        temp += i;
      }else{
        temp += i + ",";
      }
    });

    const msgenter = new MessageEmbed()
      .setColor('#0099ff')
      .setDescription('**You Own: '+nft_list.length+' nfts**\n '+temp+"\n\n `!flex <nft_id>` to flex your Metadude.")
    await message.reply({
      embeds: [msgenter]
    })
  }

  if (cmd === `${prefix}infoa`) {
    if (message.channel.id != "903019239689035828") return;
    if(!args[0] || args[0].length != 42){
      return message.reply("Address not invalid use !reg walletAddress")
    }
    var exist = await db.get('Data').find({ address: args[0]}).value()
    if(!exist) return message.reply("No walled found")
    let nft_list = await getnftlist(exist.address);
    if(nft_list.length == 0) return message.reply("You dont have any metaversials nft")
    let temp ="";
    let count = 0;
    nft_list.forEach( i=> {
      count ++;
      if(count == nft_list.length){
        temp += i;
      }else{
        temp += i + ",";
      }
    });
    const msgenter = new MessageEmbed()
      .setColor('#0099ff')
      .setDescription('**Walled of:** \n<@'+exist.Discord_id+'> \n\n **Address:** \n'+exist.address+' \n\n **NFTS:** '+nft_list.length)
    await message.reply({
      embeds: [msgenter]
    })
  }

  if (cmd === `${prefix}infod`) {
    if (message.channel.id != "903019239689035828") return;
    if(!args[0]){
      return message.reply("discord id not invalid use !reg walletAddress")
    }
    var exist = await db.get('Data').find({ Discord_id: args[0]}).value()
    if(!exist) return message.reply("No walled found")
    let nft_list = await getnftlist(exist.address);
    if(nft_list.length == 0) return message.reply("You dont have any metaversials nft")
    let temp ="";
    let count = 0;
    nft_list.forEach( i=> {
      count ++;
      if(count == nft_list.length){
        temp += i;
      }else{
        temp += i + ",";
      }
    });
    const msgenter = new MessageEmbed()
      .setColor('#0099ff')
      .setDescription('**Walled of:** \n<@'+exist.Discord_id+'> \n\n **Address:** \n'+exist.address+' \n\n **NFTS:** '+nft_list.length)
    await message.reply({
      embeds: [msgenter]
    })
  }
});


client.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	if(interaction.customId != "m_wallet") return;;
  let ex_pw = await getKeyByValue(passwordtemp,interaction.user.id);
  let pw;
  if(ex_pw){
     pw = ex_pw;
  }else{
     pw = await createpassword(interaction.user.id)
  }
  const msgenter = new MessageEmbed()
    .setColor('#0099ff')
    .setDescription("This is a read-only connection. Do not share your private keys. We will never ask for your seed phrase. We will never DM you. \n\n **Press the link to connect your wallet**\n[Connect Wallet](https://metaversials.gg/check/wallet?code="+pw+") \n\n *The link will exipire in 2 minutes* \n ")
    .setFooter({
      text: ''
    });
  interaction.reply(({
    embeds: [msgenter],
    ephemeral: true
  }))
  console.log(passwordtemp)

});


async function getnftlist(address){
  try{
  const driver =  await Driver.connect(new SimpleNet('https://mainnet.veblocks.net/'))
  const connex = new Framework(driver)

  const smartContract = connex.thor.account('0x9e68D6c7daf2e010D8B8Ee157D81DE143a7C68EF');

  const getListingsForAddress = smartContract.method(getFunctionABI('getListingsForAddress'));
  const getUnlistedTokens = smartContract.method(getFunctionABI('getUnlistedTokens'));

  const unlistedTokenIds = await getUnlistedTokens.call(address, 0, 999);
  const listedTokenIDs = await getListingsForAddress.call(address, 0, 999);
  let tokenIds = []
  if (unlistedTokenIds.decoded[0].length !== 0) {
      tokenIds = unlistedTokenIds.decoded[0];
  }

  if (listedTokenIDs.decoded[0].length !== 0) {
      tokenIds = tokenIds.concat(listedTokenIDs.decoded[0]);
  }
  return tokenIds;
}catch (error){
  return 500;
}
  //address = "0x412be61cf57c465f18677b2ebcda44d9746bcf73"
}



async function logging(discord_id,address,nftc){
  let cacheChannel = await client.channels.cache.get("951837299107332116");
  const msgenter = new MessageEmbed()
    .setColor('#0099ff')
    .setDescription("**Discord Id: **"+discord_id+" (<@"+discord_id+">) \n **Address: **"+address+" \n **total_nft: **"+nftc+"")
    .setFooter({text: ''});
      await cacheChannel.send({
        embeds: [msgenter]
    })
}



async function make_score(){
  let classifica = {};
  for (const [key, value] of Object.entries(obj_roles)) {
      classifica[key] = {req:key,role_id:obj_roles[key].role_id, text:""}
  }


  var exist_wallet = await db.get('Data').value()
  let temp =[]
  let temp2 =[]
  let temp2_count = 0;
  for (const item of exist_wallet) {
    let nft_count = await getnftlist(item.address);
    let i = await getClosestValue(roles_req,nft_count.length);
    if (nft_count.length >= roles_req[roles_req.length - 1]) {
        temp.push({discord_id:item.Discord_id,nft_count:nft_count.length});
    }else if (nft_count.length >= roles_req[roles_req.length - 2]) {
      if(temp2_count == 3){
        if(!classifica[i].text){
          classifica[i].text = 0;
        }
        classifica[i].text += 1;
      }else{
        temp2.push({discord_id:item.Discord_id,nft_count:nft_count.length});
        temp2_count++;
      }
    }
    else{
      if(!classifica[i].text){
        classifica[i].text = 0;
      }
      classifica[i].text++;
    }
    await delay(1000);
  };
  temp.sort((a, b) => parseFloat(b.nft_count) - parseFloat(a.nft_count));
  temp2.sort((a, b) => parseFloat(b.nft_count) - parseFloat(a.nft_count));
  let conta = 0;
  let emoji = ""
  Object.keys(temp).forEach(function(key) {
    if(conta == 0){
      emoji = "🥇 "
    }else if(conta == 1){
      emoji = "\n🥈 "
    }else if(conta == 2){
      emoji = "\n🥉 "
    }else{
      emoji = "\n \u200b\u200b • "
    }
        classifica[roles_req[roles_req.length - 1]].text += emoji+"<@"+temp[key].discord_id+"> **Metadudes:** "+temp[key].nft_count;
    conta++;
  });
  conta = 0;
  let fine_secondo= classifica[roles_req[roles_req.length - 2]].text
  classifica[roles_req[roles_req.length - 2]].text = ""
  Object.keys(temp2).forEach(function(key) {
    if(conta == 0){
      emoji = "🥇 "
    }else if(conta == 1){
      emoji = "\n🥈 "
    }else if(conta == 2){
      emoji = "\n🥉 "
    }else{
      emoji = "\n \u200b\u200b • "
    }
    classifica[roles_req[roles_req.length - 2]].text += emoji+"<@"+temp2[key].discord_id+"> **Metadudes:** "+temp2[key].nft_count;
    conta++;
  });
  classifica[roles_req[roles_req.length - 2]].text += "\n *and " +fine_secondo+" more...*"
  return classifica;


}


async function send_leaderboard(){

  let classifica = await make_score();
  let embed_desc = ""
  let reverse_class = Object.entries(classifica).reverse()
  await reverse_class.forEach(key => {
        embed_desc += "------- <@&"+key[1].role_id+"> **"+key[1].req+"+** ------- \n**"+key[1].text +"**\n\n"
    });
  var dd = moment().unix();
  const msgenter = new MessageEmbed()
    .setColor('#38047B')
    .setTitle("WHALE OF FAME")
    .setDescription(embed_desc +"Last update: <t:"+dd+">")
    .setFooter({text:''});
  const channel = await client.channels.cache.get("952954165959733269");
    channel.messages.fetch(`952954255424253962`).then(message => {
                  message.edit({ embeds: [msgenter] });
                  console.log("fatto")
              }).catch(err => {
                  console.error(err);
              });
}



setInterval(send_leaderboard, 1000 * 60 * 120);
send_leaderboard()









/*

const msgenter = new MessageEmbed()
  .setColor('#38047B')
  .setTitle("VERIFY YOUR ASSETS")
  .setThumbnail("https://metaversials.gg/assets/MV.png")
  .setDescription("Verify your wallet to gain access to Holder Roles and so to gain access to special channels and discord commands. "+tempp)
  .setFooter({
    text: ''
  });
client.api.channels("951825462974353448").messages.post({
    data: {
        //adds the embed here, so the button and embed will be sent together
        embeds: [msgenter],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        label: "👛 Connect Wallet",
                        // Our button id, we can use that later to identify,
                        // that the user has clicked this specific button
                        custom_id: "m_wallet"
                    }
                ]
            }
        ],
    }
})
*/
client.login("Token");

//42 address size;
