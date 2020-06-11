# STT-Datasheet-Updater
Updates a Google sheet containing data exported from datacore.app.

## Setup instructions
1. Goto the Google Sheet that you want update using the code and select Tools -> Script Editor. A file called code.gs will be created.
2. Replace the contents of text box with the code in code.gs above.
3. Create a file at https://texteditor.co with json code from https://stt.disruptorbeam.com/player and save it to Google Drive
4. Go to https://drive.google.com/, right click on the file you created and select "Get shareable link"
5. Extract the file id from the link. It will look like https://drive.google.com/file/d/FILE_ID_GOES_HERE/view?usp=sharing.
6. Insert the id into the constant on the 10th line of code.gs and save it.
7. Reload the spreadsheet an additional menu call Import data will be added.

## Usage instructions
### Importing data
1. Goto  https://texteditor.co and open the file you created on Google Drive.
2. Replace the contents with the latest code from https://stt.disruptorbeam.com/player.
3. Select the sheet that will contain the data. (For Captain Idol's Datacore Analysis Sheet it is Datacore Import)
4. Open the Import Data menu and select the data you want to import.
5. All future imports will go to the same sheet. (If you want to change the sheet to import to then select Data -> Named ranges and delete the associated range).

Note. The crew data import is designed as a replacement for the data exported from https://datacore.app.

## Google authentication on first use
Google requires you to review permissions when first using the code. After you sign in to your account it will give you a page that looks like.

![Google authorisation](https://github.com/joshurtree/STT-Datasheet-Updater/blob/master/authentication.png)

IF YOU TRUST THE CODE click on Advanced and then "Goto {{PROJECTNAME}} (unsafe)" to get to the permissions page. It will list all the permissions you will be allowing the code to use. If you happy that it won't destroy all your files then authorise them.

## Known issues
The code is currently unable to import frozen crew based on the data provided by Disruptor Beam. Any crew that are imported to the sheet while they are active and then subsequently frozen should be kept but there is no information on any crew already frozen when first importing to the sheet.
