/*
    Robin Viktorsson
    rovi1601
    rovi1601@student.miun.se
    2017-12-22
*/

/* Global variables */
var running = false; // Is the game running?
var texts = []; // All texts will be stored in here
var spans; // The current text in character array format
var points = 0, mistakes = 0, amount = 0; // Points and mistakes-related variables
var nrOfCharacters = 0, grossWPM = 0, netWPM = 0; // Character and word-related variables
var timer, ticker = 0, seconds = 60; // Time related variables
var canvas, ctx; // Canvas-related variables
var audio = new Audio('audio/error.wav'); // Error sound triggered at incorrect input

/**
 * Function reads a specific JSON file ("texts.json") and store and return its data
 * @returns The data read from the file
 */
async function importJsonFile() {
    const response = await fetch("texts.json");
    const data = await response.json();
    return data;
}


/**
 *  Function initializes the canvas and its context
 *  Sets the line-width, stroke-style and begins a patch
 */
function initializeCanvas() {

    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext('2d');
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'red';
    ctx.beginPath();
}

/**
 * Function fills the select-element with a numerous amount of options. The options are based on the title
 * of the texts which was imported from the JSON file during the importJsonFile-function.
 */
function populateSelect() {

    var lang = document.querySelector('input[name="language"]:checked').value;
    var select = document.getElementById("selectedText");
    select.options.length = 0; //Remove all items before filling it up again.
    for(var i = 0; i < texts.length; i++) {
        if(texts[i].language == lang){
            var opt = texts[i].title;
            var el = document.createElement("option");
            el.textContent = opt;
            el.value = opt;
            select.appendChild(el);
        }
    }
}

/**
 * Function populates the textarea with a to be read and typed based on the option selected in the select-element
 * The text is divided into an charArray where all characters is represented as a span which contains the "bg" class
 * that is later used as a helper to clear the characters background-color (green or red) assigned during the game.
 */
function populateText() {

    var textArea = document.getElementById("textArea");
    var selectedText = document.getElementById("selectedText");
    var textTitle = selectedText.options[selectedText.selectedIndex].text;
    var result = texts.filter(function( obj ) {
        return obj.title == textTitle;
    });

    //Lets make an chararray of all the characters in the text and add class="bg" for them
    var arr = Array.from(result[0].text);
    var complete = "";
    for(var i = 0; i < arr.length; i++)
        complete += "<span class='bg'>"+arr[i]+"</span>";

    // Add new text to the div
    textArea.innerHTML = "";
    textArea.innerHTML +=
        "<h3>" + result[0].title +"</h3>\n" +
        "<h5>" + result[0].author + " (" + countWords(result[0].text) + " words, " + result[0].text.length +" chars)" + "</h5>\n" +
        "<p id='textToWrite'>" + complete + "</p>";

    nrOfCharacters = result[0].text.length;

    /**
     * Function counts the amount of words in a string based on the amount of spaces
     * @param str The string to be manipulated.
     * @returns An integer representing the amount of spaces in the string
     */
    function countWords(str) {
        return str.split(" ").length;
    }
}

/**
 *  Function starts the game. This includes the following:
 *  - Changes the start-button image
 *  - Checks if an valid text has been loaded in the textsection
 *  - Resets the game-related variables
 *  - Resets the game-related HTML-elements (mostly spans)
 *  - Disables certain input-elements such as language-selection and text-selection
 *  - Starts the countdown-ticker
 */
function startGame() {

    var imageSource = document.getElementById("btnImage");
    if(running) {

        imageSource.src = "img/startbtn.png";
        gameOver();

    } else {

        var poem = document.getElementById("textToWrite").innerHTML;
        if(poem.length != 0){ // This should never happen, but just in case.
            resetGame();
            clearSpans();
            disableInputElements();
            countDown(); // Game has started
            imageSource.src = "img/stopbtn.png";
        }

    }

    /**
     * Function resets variables, canvas contexts and certain string to its original values.
     */
    function resetGame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ticker = 0;
        grossWPM = 0;
        netWPM = 0;
        points = 0;
        amount = 0;
        mistakes = 0;
        seconds = 60;
        document.getElementById("grossWPM").innerHTML = "100";
        document.getElementById("accuracy").innerHTML = "100%";
        document.getElementById("netWPM").innerHTML = "100";
        document.getElementById("errors").innerHTML = "0";
        document.getElementById("points").innerHTML = points.toString();
        document.getElementById("mistakes").innerHTML = mistakes.toString();
        document.getElementById("score").innerHTML = "0";
        document.getElementById("time").innerHTML = "60";
        running = true;
    }

    /**
     * Function removes certain classes in all the spans surrounding the characters.
     * This resets the background color of each character (red/green) which was added during the game
     * representing an correct or incorrect input.
     * It also resets the blinking cursor and moves it to the first character.
     */
    function clearSpans() {

        spans = document.querySelectorAll(".bg");

        for(var i = 0; i < spans.length; i++){

            if(spans[i].classList.contains("blinkingCursor"))
                spans[i].classList.remove("blinkingCursor");

            if(spans[i].classList.contains("red"))
                spans[i].classList.remove("red");

            if(spans[i].classList.contains("green"))
                spans[i].classList.remove("green");

            if(spans[i].classList.contains("redBg"))
                spans[i].classList.remove("redBg");

            if(spans[i].classList.contains("greenBg"))
                spans[i].classList.remove("greenBg");
        }

        spans[0].classList.add("blinkingCursor"); // Add blinking cursor to the first span
    }

    /**
     *  Disables certain input elements while the game typing game has started
     */
    function disableInputElements() {
        document.getElementById("ignoreCase").disabled = true;
        document.getElementById("selectedText").disabled = true;
        document.getElementById("svBtn").disabled = true;
        document.getElementById("enBtn").disabled = true;
    }

    /**
     *  Countdown function containing local functions and a timer which ticks every second.
     *  The local functions adjusts labels and draws on the canvas. It also checks whetever the game is over or not.
     */
    function countDown() {

        timer = setInterval(function(){
            ticker++;
            seconds--;
            grossWPM = (amount / 5) / (ticker / 60);
            netWPM = grossWPM - (mistakes / (ticker / 60));
            updateLabels(grossWPM, netWPM);
            drawOnCanvas(ticker, grossWPM);
            if (seconds === 0) {
                gameOver();
            }
        }, 1000);

        /**
         * Updates all labels (gross-wpm, net-wpm and time) every time the timer ticks
         * @param grossWPM Words per minute calculated not considering any typing mistakes made
         * @param netWPM Words per minute calculated taken typing mistakes in consideration
         */
        function updateLabels(grossWPM, netWPM) {
            document.getElementById("grossWPM").innerHTML = Math.round(grossWPM).toString();
            document.getElementById("netWPM").innerHTML = Math.round(netWPM).toString();
            document.getElementById("time").innerHTML = seconds.toString();
        }

        /**
         *  Function draws a new line on the canvas
         *  The lines position is based on current time and grossWPM
         */
        function drawOnCanvas(x, y) {
            x = x * (canvas.width / 60);
            ctx.lineTo(x, canvas.height - y);
            ctx.stroke();
        }
    }
}

/**
 *  Function represents what should happen when the game is over. It resets many variables and, enables previously
 *  disabled input elements and presents the score to the user using an alert-box.
 */
function gameOver() {

    running = false;
    clearInterval(timer);
    seconds = 60;
    amount = 0;
    alert("Game over! Your total score is " + (points - mistakes));
    document.getElementById("btnImage").src = "img/startbtn.png";
    enableInputElements();

    /**
     * Enables certain input elements which was disabled during the game
     */
    function enableInputElements() {
        document.getElementById("ignoreCase").disabled = false;
        document.getElementById("selectedText").disabled = false;
        document.getElementById("svBtn").disabled = false;
        document.getElementById("enBtn").disabled = false;
    }
}

/**
 * Event-function which is triggered whenever a key on the keyboard is pressed.
 * Its function is relevant when the game is running. It checks if the current game is finished and
 * whetever the key pressed is correct or incorrect. Depending on that it will do the following things:
 *
 * [If the key pressed is CORRECT]
 * - Increase the points variable bound to the current game
 * - Add a green background and text-color to the character/space indicating it was an expected input
 * [If the key press is INCORRECT]
 * - Increase the mistakes variable bound to the current game
 * - Play an audio file indicating unexpected input
 * - Add a red background and text-color to the character/space indicating it was an unexpected input
 *
 * It also checks if the game is finished or not. If it is finished it needs to call the GameOver function. If not
 * it needs to prepare for next character input.
 */
function pressedKey(evt){

    // Only trigger code if game is running
    if(running){
        evt = evt || window.event;
        var charCode = evt.keyCode || evt.which;
        var typed = String.fromCharCode(charCode);
        var expected = spans[amount].innerHTML;
        var checkBox = document.getElementById("ignoreCase");

        // Check if "Ignore Case"-setting is enabled or not
        if(checkBox.checked){
            typed = typed.toLowerCase();
            expected = expected.toLowerCase();
        }

        // Check if the character typed is expected (correct) or not
        if(expected == typed){ // If correct
            points++;
            if(expected === ' ')
                spans[amount].classList.add("greenBg");
            else
                spans[amount].classList.add("green");

            document.getElementById("points").innerHTML = points.toString();

        } else{ // If incorrect
            audio.play();
            mistakes++;
            if(expected === ' ')
                spans[amount].classList.add("redBg");
            else
                spans[amount].classList.add("red");

            document.getElementById("mistakes").innerHTML = mistakes.toString(); // This can be deleted later.
            document.getElementById("errors").innerHTML = mistakes.toString();
        }

        document.getElementById("score").innerHTML = (points - mistakes).toString();
        prepareNextInput();
        isGameFinished();

        /**
         * Function prepares the next character input by clearing current settings. This includes:
         * - Ensuring that the next character in the array is expected at next key input.
         * - Updating the WPM
         * - Updating the WPM and ACCURACY string presented to the user
         * - Clear the textfield
         */
        function prepareNextInput() {

            // Remove blinking cursor from the current character
            spans[amount].classList.remove("blinkingCursor");
            amount++; // Increase the amount

            // Update WPM
            if (ticker === 0) ticker = 1;
            grossWPM = (amount / 5) / (ticker / 60);
            netWPM = grossWPM - (mistakes / (ticker / 60));

            // Update the labels and clear input textfield
            document.getElementById("inputTextField").value = "";
            document.getElementById("grossWPM").innerHTML = Math.round(grossWPM).toString();
            document.getElementById("netWPM").innerHTML = Math.round(netWPM).toString();
            document.getElementById("accuracy").innerHTML = (((amount - mistakes) / amount) * 100).toFixed(2).toString() + "%";
        }

        /**
         * Function check whetever the game is finished or not (all character has been typed) and what shall
         * happen if its not, which is:
         * - Add a blinking cursor to the coming character
         * - Count the total words that has been typed (important for calculating WPM)
         */
        function isGameFinished() {

            if (nrOfCharacters === amount) { // Finished all text.
                console.log("Game over!");
                gameOver();
            } else {
                spans[amount].classList.add("blinkingCursor"); // And add it to the new one
            }
        }
    }
}

/**
 * Initializing function which starts on window load
 * Its task is to call functions that populates controls such as select, section.innerHTML and more.
 * It also calls functions which adds eventListeners to necessary buttons, checkboxes and textfields.
 */
window.onload = function() {

    importJsonFile()
        .then(data => {
         var text = null;
         var myData = data.objects;
         for(var i = 0; i < myData.length; i++) {
             text = {
                 title: myData[i].title,
                 author: myData[i].author,
                 language: myData[i].language,
                 text: myData[i].text
             };
             texts.push(text);
         }
         return texts;
        })
        .then(function() { // Ensure its done after the files has been fully loaded, so there is some text to put in the select drop down list.
            initializeComponents();
            addEventListeners();
        })
        .catch(reason => alert(reason.message))

    /**
     * Initializing relevant components
     * Its task is to populate controls such as select, sections innerHTML, setup the canvas and more.
     */
    function initializeComponents() {
        populateSelect();
        populateText();
        initializeCanvas();
    }

    /**
     * Adds Eventlisteners to relevant input elements such as radiobuttons, checkboxes and textfields.
     */
    function addEventListeners() {
        document.getElementById("svBtn").addEventListener("click", populateSelect, {passive: true});
        document.getElementById("enBtn").addEventListener("click", populateSelect, {passive: true});
        document.getElementById("svBtn").addEventListener("change", populateText, {passive: true});
        document.getElementById("enBtn").addEventListener("change", populateText, {passive: true});
        document.getElementById("selectedText").addEventListener("change", populateText, {passive: true});
        document.getElementById("inputTextField").addEventListener("keypress", pressedKey, false);
        document.getElementById("btnStart").addEventListener("click", startGame, false);
    }
}
