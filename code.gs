/*
 * Star Trek Timelines Datasheet Updater
 *
 * Updates the datasheet generated by datacore.app directly from JSON data contained in a google drive file.
 *
 * Released under an Apache 3.0 licence
 */
 
/* Used to identify the file on Google Drive that contains data from disruptorbeam.com/player */
const GOOGLE_DRIVE_FILEID = 'INSERT_ID_HERE';
 
/**
 * Adds menu items for importing data
 * @param {Event} e The onOpen event.
 */
function onOpen(e) {
  // Add a custom menu to the spreadsheet.
  SpreadsheetApp.getUi() // Or DocumentApp, SlidesApp, or FormApp.
      .createMenu('Import data')
      .addItem('Import crew data', 'importCrewData')
      .addItem('Import item data', 'importItemData')
      .addItem('Import voyage data', 'importVoyageData')
      .addSeparator()
      .addItem('Import all data', 'importAllData')
      .addToUi();
}

function importData_() {
  let file = DriveApp.getFileById(GOOGLE_DRIVE_FILEID);
  return JSON.parse(file.getBlob().getDataAsString());
}

function replaceContents_(sheet, newContent) {
  sheet.clearContents();
  sheet.getRange(1, 1, newContent.length, newContent[0].length).setValues(newContent);
}

function getSheetAsRange_(sheet) {
  return sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
}

const BATCH_IMPORT_ERROR = 363;
const OCCUPIED_RANGE_NOTE = "Data sheet used";
const OCCUPIED_PROMPT = `You are replacing different an existing import sheet. 
                          Do you want to do this?`;
const OCCUPIED_ERROR = 'Sheet already used';

function getTargetSheet_(name, create) {
  let ss = SpreadsheetApp.getActiveSpreadsheet(); 
  let range = ss.getRangeByName(name);
  
  if (range == null && create) {
    range = ss.getActiveSheet().getRange(1, 1);
    let overlaps = ss.getNamedRanges().filter(r => range.getSheet() == r.getRange().getSheet());
    if (overlaps.length != 0) {
      let ui = SpreadsheetApp.getUi();
      let response = ui.alert(OCCUPIED_PROMPT,
                              ui.ButtonSet.YES_NO);
                             
      if (response != ui.Button.YES)
        throw OCCUPIED_ERROR;
        
      overlaps.forEach(r => ss.removeNamedRange(r.getName()));
    } 
    ss.setNamedRange(name, range);
  } 
    
  if (range == null)
    throw BATCH_IMPORT_ERROR;
  
  return range.getSheet();
}

function importAllData() {
  const allDataFuncs = [ importCrewData, importItemData, importVoyageData ];
  let successes = 0;
  
  allDataFuncs.forEach(func => {
    try {
      func(true);
      ++successes;
    } catch (e) {
      if (e != BATCH_IMPORT_ERROR)
        throw e;
    }   
  });
  
  let message = successes ? `Successfully imported ${successes} data sets` : 
                            'Please import data set individually before using batch update';
  SpreadsheetApp.getUi().alert(message); 
}

function createColumnUpdaters_() {
  const stat = (skill, type) => (data, id) => {
    let name = skill +  '_skill';
    let skills = new Object(data.skills);
    
    if (!Object.keys(skills).includes(name)) 
      return 0;
    
    if (type != 'core')
      type = 'range_' + type;
      
    return data.skills[name][type]
  };
  
  const value = val => (d, id) => val;
  const fromPlayer = path => (data, id) => {
    let indicies = path.split('/');
    let retVal = data;
    
    for (index in indicies) 
      retVal = retVal[indicies[index]];
    
    return retVal;
  }
  const fromImmortals = index => (pd, id) => id[index];
  const fromImmortalsNum = index => (pd, id) => parseInt(id[index].slice(1));
  const parseCollections = (pd, id) => ""; // TODO
  const inPortal = (pd, id) => id[31] == 'y';
  
  return [[
    fromPlayer('name'), value(true), fromPlayer('short_name'),
    fromPlayer('max_rarity'), fromPlayer('rarity'), fromPlayer('level'), value(0),
    (data, id) => { let values = []; for (equip in data.equipment) {values.push(data.equipment[equip][0]); }; return values.join(' '); },
    fromPlayer('equipment_rank'), inPortal, parseCollections, 
    fromImmortalsNum(26), value(""),
    stat('command', 'core'), stat('command', 'min'), stat('command', 'max'),
    stat('diplomacy', 'core'), stat('diplomacy', 'min'), stat('diplomacy', 'max'),
    stat('engineering', 'core'), stat('engineering', 'min'), stat('engineering', 'max'),
    stat('medicine', 'core'), stat('medicine', 'min'), stat('medicine', 'max'),
    stat('science', 'core'), stat('science', 'min'), stat('science', 'max'),
    stat('security', 'core'), stat('security', 'min'), stat('security', 'max'),
    fromImmortals(21), fromPlayer('action/name'), 
    (data, id) => ['Attack','Evasion','Accuracy'][data.action.boost_type],
    fromPlayer('action/bonus_amount'), fromPlayer('action/initial_cooldown'), fromPlayer('action/duration'), fromPlayer('action/cooldown'),
    value(''), value(''), value(''), value(''), value(''), value(''), value(''),
    fromPlayer('archetype_id')
  ],
  [
    fromImmortals(0), fromPlayer('frozen'), fromImmortals(2),
    fromImmortals(1), fromImmortals(1), value(100), fromPlayer('copies'),
    value(''), value(9), inPortal, parseCollections,
    fromImmortalsNum(26), value(''),
    fromImmortals(3), fromImmortals(4), fromImmortals(5),
    fromImmortals(6), fromImmortals(7), fromImmortals(8),
    fromImmortals(9), fromImmortals(10), fromImmortals(11),
    fromImmortals(12), fromImmortals(13), fromImmortals(14),
    fromImmortals(15), fromImmortals(16), fromImmortals(17),
    fromImmortals(18), fromImmortals(19), fromImmortals(20),
    fromImmortals(21), value(''), 
    value(''), value(''),
    value(''), value(''), value(''), value(''), value(''),
    value(''), value(''), value(''), value(''), value(''),
    fromPlayer('archetype_id', '')
  ]];
}

class CrewMap extends Map {
  add(character) {
      if (this.has(character.name)) 
        character.duplicate = this.get(character.name);
      else
        character.duplicate = false;
        
      this.set(character.name, character);
  }
}

/** Imports crew data from an JSON file on */
function importCrewData(batch) {
  let app = SpreadsheetApp;
  let sheet = getTargetSheet_('RawCrewData', !batch);
  // Data from The Big Book of Backend Data
  let immortalss = app.openById('1iYP_XqIvaGKgvINqk7vaQwfYhaSIXWatD3YD09DAXwY');
  let immortalData = getSheetAsRange_(immortalss.getSheetByName('Raw Crew Data')).getValues();
  let [playerUpdaters, immortalUpdaters] = createColumnUpdaters_();
  let parsedData = importData_();
  let crewMap = new CrewMap();
  
  // Setup map of active crew
  for (i in parsedData.player.character.crew) {
    let character = parsedData.player.character.crew[i];
    
    if (!character.in_buy_back_state) {
      character.frozen = false;
      character.copies = 1;
      
      crewMap.add(character);
    }
  }
  
  if (sheet.getLastRow() > 1) {
    // Attempt to find frozen crew
    let crewNames = sheet.getRange(2, 1, sheet.getLastRow()).getValues().flat(); 
    let archetypeIds = sheet.getRange(2, sheet.getLastColumn(), sheet.getLastRow()).getValues().flat();
    
    for (i in parsedData.player.character.stored_immortals) {
      let immortal = parsedData.player.character.stored_immortals[i];
      let crewIndex = archetypeIds.indexOf(immortal.id);
      
      if (crewIndex >= 0) {
        let crewName = crewNames[crewIndex];
        crewMap.add({
          'name' : crewName,
          'frozen' : true,
          'archtype_id' : immortal.id, 
          'copies' : immortal.quantity
        });
      }
    }
  }
  
  let outputData = new Array();

  const headers = [
    'Name',	'Have', 'Short name', 
    'Max rarity', 'Rarity', 'Level', 'Frozen', 
    'Equipment', 'Tier', 'In portal', 'Collections',
    'Voyage Rank', 'Gauntlet Rank',
    'Command Core', 'Command Min', 'Command Max',
    'Diplomacy Core', 'Diplomacy Min', 'Diplomacy Max', 
    'Engineering Core', 'Engineering Min', 'Engineering Max',
    'Medicine Core', 'Medicine Min', 'Medicine Max',
    'Science Core', 'Science Min', 'Science Max',
    'Security Core', 'Security Min', 'Security Max',
    'Traits', 'Action name', 'Boosts Amount',
    'Initialize	Duration', 'Cooldown', 'Bonus Ability',
    'Trigger Uses per Battle (Not Used)', 'Handicap Type (Not Used)','Handicap Amount (Not Used)',
    'Accuracy', 'Crit Bonus', 'Crit Rating', 'Evasion', 'Charge Phases (Not Used)',
    'Character ID'];
  outputData.push(headers);
  
  let crewOwned = 0;
  let crewFrozen = 0;
  
  for (let row = 2; row < immortalData.length; ++row) {
    let crewName = immortalData[row][0];
    //console.info('Looking at ' + characterName);
    if (crewName == '')
      continue;
      
    let crew = crewMap.has(crewName) ? crewMap.get(crewName) : { 'name' : crewName, 'frozen' : false, 'copies' : 0 };
          
    while (crew) {
      let outputRow = [];
      let updaters = !crew.frozen && crew.copies ? playerUpdaters : immortalUpdaters;
      
      for (let column = 0; column < headers.length; ++column)  
        outputRow.push(updaters[column](crew, immortalData[row]));
      
      if (crew.frozen) 
        crewFrozen += crew.copies;
      else
        crewOwned += crew.copies;
      
      outputData.push(outputRow);
      crew = crew.duplicate;
    }
  }
  
  replaceContents_(sheet, outputData);
  app.getUi().alert(`You own ${crewOwned} crew and have ${crewFrozen} in the freezer.`);
}

/** Import Name, Rarity and quantity owned of every item into active sheet */
function importItemData(batch) {
  let targetSheet = getTargetSheet_('RawItemData', !batch);
  let items = importData_().player.character.items;
  let outputMap = new CrewMap();
  let output = [];
  
  output.push(['Name', 'Basic', 'Common', 'Uncommon', 'Rare', 'Super rare', 'Legendary']);
  
  for (i in items) {
    let item = items[i];
    if (!outputMap.has(item.name)) 
      outputMap.set(item.name, [item.name, 0, 0, 0, 0, 0, 0]);
    
    outputMap.get(item.name)[item.rarity + 1] = item.quantity;
  }
  
  let sortedKeys = Array.from(outputMap.keys()).sort();
  
  for (key in sortedKeys)
    output.push(outputMap.get(sortedKeys[key]));
    
  replaceContents_(targetSheet, output);
}

/** Import Voyage data into active sheet */
function importVoyageData(batch) {
  let targetSheet = getTargetSheet_("RawVoyageData", !batch);
  let output = [];
  let data = importData_().player.character;
  let voyageData = data.voyage_descriptions[0];
  
  let skillTypeMap = new Map();
  skillTypeMap.set(voyageData.skills.primary_skill, 'Primary');
  skillTypeMap.set(voyageData.skills.secondary_skill, 'Secondary');
  
  const parseTrait = trait => trait.replace('_', ' ')
                                   .replace('doctor', 'Physician')
                                   .replace(/\b(\w)/g, c => c.toUpperCase());
  
  let current = data.voyage[0];
  let voyager = current ? slot => current.crew_slots[slot].crew.name : slot => "None";
  
  output.push(["Voyage Status:", "", current ? current.state : "Not out", "", "", ""]);
  output.push(['', '', '', '', '', '']);
  output.push(['Skill', 'Type', 'Trait 1', 'Voyager 1', 'Trait 2', 'Voyager 2']);
  
  for (let i = 0; i < voyageData.crew_slots.length; i += 2) {
    let slot1 = voyageData.crew_slots[i];
    let slot2 = voyageData.crew_slots[i+1];
    let skill = slot1.skill;
    
    output.push([skill.charAt(0).toUpperCase() + skill.slice(1, -6), 
                 skillTypeMap.get(skill), 
                 parseTrait(slot1.trait), 
                 voyager(i),
                 parseTrait(slot2.trait),
                 voyager(i+1)]);
  }
  
  replaceContents_(targetSheet, output);
}
