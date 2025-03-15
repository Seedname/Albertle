// Structure and some methods based on this repo
// https://github.com/Morgenstern2573/wordle_clone/tree/master/build

// Based on the game wordle
// https://www.nytimes.com/games/wordle/index.html

// Audio samples from Josh Harmon
// https://www.youtube.com/watch?v=qyyHDXxjPPQ

// Initialize global variables

// The list of all words the user has guessed
let guesses = [];
// The list containing the letters in the users current guess
let currentGuess = [];
// The index of the current real word
let wordToGuess = -1;
// Flag to check if an animation is occuring to pause user interaction
let inAnimation = false;

// testing
let requests_responses = [];

// audio bucket
let sounds = {};

function loadAudio(source) {
    return new Howl({src: [source]});
}

function playSound(sound) {
    sounds[sound].play();
}

// Options for toaster popup boxes
toastr.options = {
    "closeButton": false,
    "debug": false,
    "newestOnTop": true,
    "positionClass": "toast-top-center",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "fast",
    "hideDuration": "100",
    "timeOut": "1500",
    "extendedTimeOut": "1500",
    "showEasing": "swing",
    "hideEasing": "swing",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut",
    "escapeHTML": true,
};

// getCookie function by kirlich @ https://stackoverflow.com/questions/10730362/get-cookie-by-name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// function that sends a POST request to the API endpoint for a new random word
const baseUrl = 'https://5kos39kthd.execute-api.us-east-1.amazonaws.com/prod';

async function getWordToGuess() {
  const apiUrl = '/api/get-word'; // Updated endpoint path
  try {
    const response = await fetch(baseUrl + apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Important for sending cookies
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    requests_responses.push({
      endpoint: baseUrl + apiUrl,
      method: 'POST'
    });
    requests_responses.push(result);
    wordToGuess = result.word;
  } catch (err) {
    toastr.info("Error fetching word");
    console.error(err);
  }
}


// function that sends a POST request to the API endpoint to check the current guess against the real word

async function checkGuess() {
    if (wordToGuess === -1) {
      return;
    }
    const guessWord = currentGuess.join("");
    const apiUrl = '/api/guess'; // Updated endpoint path
    let hardMode = document.getElementById('hard-mode-toggle').checked;
    const data = {
      word: guessWord,
      guesses: guesses,
      word_index: wordToGuess,
      hard_mode: hardMode
    };
    
    try {
      const response = await fetch(baseUrl + apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Important for sending cookies
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      requests_responses.push({
        endpoint: baseUrl + apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      requests_responses.push(result);
      
      switch (result.state) {
        case 'game':
          guesses.push(guessWord);
          animateBoxes(result.score, "");
          break;
        case 'lose':
          guesses.push(guessWord);
          animateBoxes(result.score, result.message);
          break;
        case 'win':
          guesses.push(guessWord);
          animateBoxes(result.score, result.message);
          break;
        case 'error':
          toastr.info(result.message);
          animateError();
          break;
      }
    } catch (err) {
      toastr.info("Error checking guess");
      console.error(err);
    }
  }


// function that animates boxes and displays popup messages

function animateBoxes(stringScore, rightGuessString) {
    var letterColor = [];
    // convert string score into color classes
    for (let i = 0; i < stringScore.length; i++) {
        switch (stringScore[i]) {
            case '!':
                letterColor.push('gray');
                break;
            case '?':
                letterColor.push('yellow');
                break;
            case '*':
                letterColor.push('green');
                break;
        }
    }

    let row = document.getElementsByClassName("letter-row")[guesses.length-1];
    let delta = 300;
    let animationTime = 325;
    const guess = currentGuess.join("");
    inAnimation = true;

    for (let i = 0; i < 5; i++) {
        let box = row.children[i];
        let delay = delta * i;

        // set flip boxes animations with different delays for each box
        setTimeout(() => {
            $(box).css({
                'animation': `flipAnimation ${animationTime/1000}s linear`
            });
            playSound(letterColor[i]);
        }, delay);

        setTimeout(() => {
            // Shade the box with the color
            box.classList.add(letterColor[i]);
        }, delay + animationTime/2);

        setTimeout(() => {
            // reset css when animation ends so another animation can take place
            $(box).css('animation', 'none'); 
            $(box)[0].offsetHeight;
        }, delay + animationTime);
    }

    setTimeout(() => {
        // Run this code after the flip animations are finished
        if (stringScore === '*****') {
            toastr.options.timeOut = 3000;
            toastr.info(rightGuessString);
            toastr.options.timeOut = 1500;
            playSound("win");
            $("#next-word").css({visibility: "visible", opacity: 0.0}).animate({opacity: 1.0}, 1000);
        } else if (guesses.length === 6) {
            toastr.options.timeOut = 0;
            toastr.info(rightGuessString.toUpperCase());
            toastr.options.timeOut = 1500;
            $("#next-word").css({visibility: "visible", opacity: 0.0}).animate({opacity: 1.0}, 1000);
        }
        
        let delta = 100;
        for (let i = 0; i < 5; i++) {
            // add the shading of letters to the keyboard
            shadeKeyBoard(guess[i], letterColor[i]);
            
            // start the winning animation if the player won
            if (stringScore === '*****') {
                let box = row.children[i];
                let delay = delta * i;
                setTimeout(() => {
                    $(box).css({
                        'animation': 'winAnimation 0.5s ease-in-out'
                    });
                }, delay);
            }
        }
        inAnimation = false;


    }, delta * 6)
    

    if (stringScore === '*****') {
        console.log(JSON.stringify(requests_responses));
        wordToGuess = -1;
        return;
    } else {
        currentGuess = [];
        if (guesses.length === 6) {
            console.log(JSON.stringify(requests_responses));
            wordToGuess = -1;
        }
    }

    // disable hard mode box when a word is added
    const hardModeBox = document.getElementById('hard-mode-slider');
    if (guesses.length > 0 && !hardModeBox.classList.contains('disabled')) {
        hardModeBox.classList.add('disabled');
    }
}


// function that animates boxes shaking when an error occurs

function animateError() {
    playSound("error");
    let row = document.getElementsByClassName("letter-row")[guesses.length];
    // reset css
    $(row).css('animation', 'none'); 
    $(row)[0].offsetHeight;
    // call the shake animation twice
    $(row).css({
        'animation': 'shakeAnimation 0.2s ease-out',
        'animation-iteration-count': 2
    });
}


// function that shades the keyboard letters with the color of highest precedence (green > yellow > gray)

function shadeKeyBoard(letter, color) {
    for (const elem of document.getElementsByClassName("keyboard-button")) {
        if (elem.textContent.toLowerCase() === letter) {
            let oldColor = elem.classList;

            // it's already green, don't change it
            if (oldColor.contains("green")) {
                return;
            }

            // if it's yellow and the current color isn't greenl, don't change it
            if (oldColor.contains("yellow") && color !== "green") {
                return;
            }

            // otherwise, update the color
            elem.classList = "keyboard-button";
            elem.classList.add(color);
            break;
        }
    }
}


// resets a keyboard key to default state

function resetKey(letter) {
    for (const elem of document.getElementsByClassName("keyboard-button")) {
        if (elem.textContent.toLowerCase() === letter) {
            // set key to default state
            elem.classList = "keyboard-button";
            break;
        }
    }
}


// function to delete the last letter in the current row

function deleteLetter() {
    let row = document.getElementsByClassName("letter-row")[guesses.length];
    let box = row.children[currentGuess.length - 1];
    box.textContent = "";
    box.classList.remove("filled-box");
    currentGuess.pop();
}


// function to add the last letter in the current row

function insertLetter(pressedKey) {
    if (currentGuess.length === 5) {
        return;
    }

    playSound("press");
    pressedKey = pressedKey.toLowerCase();    
    let row = document.getElementsByClassName("letter-row")[guesses.length];
    let box = row.children[currentGuess.length];
    currentGuess.push(pressedKey);

    $(box).css('animation', 'none');
    $(box)[0].offsetHeight; 
    $(box).css({
        'animation': 'pulse 0.05s ease-in-out'
    });
    
    box.textContent = pressedKey;
    box.classList.add("filled-box");
}

// function for key presses

function keyPressed(key) {
    // if a user presses enter while the next word button is visible, it resets the game
    if (!inAnimation && document.getElementById("next-word").style.visibility === "visible" && String(key) === "Enter") {
        resetGame();
    }

    // checks if the game is over, hasn't started, or is in an animation
    if (guesses.length === 6 || wordToGuess === -1 || inAnimation) {
        return;
    }

    let pressedKey = String(key);
    
    // delete the last letter if backspace is pressed
    if (pressedKey === "Backspace" && currentGuess.length !== 0) {
        playSound("press");
        deleteLetter();
        return;
    }

    // check the current guess when enter is pressed
    if (pressedKey === "Enter") {
        checkGuess();
        return;
    }

    // make sure the key is a letter
    let found = pressedKey.match(/^[a-z]$/gi);
    if (!found || found.length > 1) {
        return;
    } else {
        // only run when the user inputs a letter
        insertLetter(pressedKey);
    }
}


// event listener for key presses
document.addEventListener("keydown", (event) => {
    keyPressed(event.key);
});


// event listener for on-screen keyboard clicks

document.getElementById("keyboard-cont").addEventListener("click", (event) => {
    // checks if the game is over, hasn't started, or is in an animation
    if (guesses.length === 6 || wordToGuess === -1 || inAnimation) {
        return;
    }

    const target = event.target;

    // makes sure that the button pressed is a keyboard button
    if (!target.classList.contains("keyboard-button")) {
        return;
    }

    let key = target.textContent;

    // maps delete key to backspace keypress
    if (key === "Del") {
        key = "Backspace";
    }

    // runs the same function for key presses
    keyPressed(key);
});


// Reset entire game state

function resetGame() {
    requests_responses = [];

    // reset global variables to default
    guesses = [];
    currentGuess = [];
    wordToGuess = -1;
    inAnimation = false;

    let deltaX = 100;
    let deltaY = 50;
    let animationTime = 115;
    inAnimation = true;

    let rows = document.getElementsByClassName("letter-row");
    for (let row = 0; row < rows.length; row++) {
        for (let i = 0; i < 5; i++) {
            let box = rows[row].children[i];
            let delay = deltaX * i + deltaY * row;
            
            // Do a flip box animation when the next button is pressed that resets the objects
            setTimeout(() => {
                $(box).css({
                    'animation': `flipAnimation ${animationTime/1000}s linear`
                });
                playSound("flip");
            }, delay);

            setTimeout(() => {
                box.classList = "letter-box";
                resetKey(box.textContent);
                box.textContent = "";
            }, delay + animationTime/2);

            setTimeout(() => {
                $(box).css('animation', 'none'); 
                $(box)[0].offsetHeight;
            }, delay + animationTime);
        }
    }

    setTimeout(() => {
        inAnimation = false;

        // Reset classes for all keyboard buttons
        for (const elem of document.getElementsByClassName("keyboard-button")) {
            elem.classList = "keyboard-button";
        }
    }, deltaX * 4 + deltaY * 6);

    // delets all toaster popups that are visible
    toastr.remove();

    // Make next word button hidden again
    $("#next-word").css({visibility: "hidden", opacity: 1.0});

    // re-enable hard mode box
    const hardModeBox = document.getElementById('hard-mode-slider');
    if (hardModeBox.classList.contains('disabled')) {
        hardModeBox.classList.remove('disabled');
    }

    // fetch a new word to guess
    getWordToGuess();
}


// calls resetGame when the next word button is pressed

document.getElementById("next-word-button").addEventListener("click", () => resetGame());


// event listener to toggle hard mode on or off

document.getElementById('hard-mode-toggle').addEventListener('click', function (event) {
    const button = this;

    if (guesses.length === 6 || wordToGuess === -1) {
        button.checked = !button.checked;
        return;
    }

    // If the game isn't at the start of the round and the user tries to press the switch, cancel
    if (!button.classList.contains('on')) {
        if (guesses.length > 0) {
            button.checked = !button.checked;
            playSound("error");
            toastr.info("Hard mode can only be enabled at the start of a round");
            return;
        }
    }

    button.classList.toggle('on');
});


// Initial setup to game once the page loads

function setup() {
    // Initialize button state
    document.getElementById('hard-mode-toggle').checked = false;

    // retrieve word to guess
    getWordToGuess();

    // set toast info css to start at correct position
    const firstRow = document.querySelector("#game-board > div:nth-child(1)");
    const style = document.createElement('style');
    style.textContent = `
      #toast-container > div.toast-info:first-of-type {
          margin-top: ${firstRow.getBoundingClientRect().top-20}px !important;
      }
    `;
    document.head.appendChild(style);

    // load audio 
    sounds["gray"] = loadAudio("audio/gray.flac");
    sounds["yellow"] = loadAudio("audio/yellow.flac");
    sounds["green"] = loadAudio("audio/green.flac");
    sounds["press"] = loadAudio("audio/press.flac");
    sounds["win"] = loadAudio("audio/win.flac");
    sounds["flip"] = loadAudio("audio/flip.flac");
    sounds["error"] = loadAudio("audio/error.flac");
}

setup();