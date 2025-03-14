
document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let gameState = {
        playerName: '',
        category: '',
        difficulty: '',
        currentWord: '',
        correctWord: '',
        score: 0,
        targetScore: 0,
        hintsLeft: 3,
        timeLeft: 0,
        totalTimeLeft: 0,  // New property to track total time left
        timer: null,
        currentHints: [],
        hintIndex: 0,
        wordsUsed: new Set()
    };

    // Game configuration
    const gameConfig = {
        Easy: { 
            timeLimit: 20,
            targetScore: 10  // Need 10 correct words to win on Easy
        },
        Medium: { 
            timeLimit: 15,
            targetScore: 15  // Need 15 correct words to win on Medium
        },
        Hard: { 
            timeLimit: 8,
            targetScore: 20  // Need 20 correct words to win on Hard
        }
    };

    // DOM Elements
    const elements = {
        wordDisplay: document.querySelector(".word"),
        hintText: document.querySelector(".hint span"),
        timeText: document.querySelector(".time span b"),
        inputField: document.querySelector(".input-field"),
        scoreDisplay: document.querySelector(".score"),
        targetScoreDisplay: document.querySelector(".total-score-value"),
        wordsCompletedDisplay: document.querySelector(".words-completed"),
        hintBtn: document.querySelector(".hint-btn"),
        checkBtn: document.querySelector(".check-word"),
        refreshBtn: document.querySelector(".refresh-word"),
        startBtn: document.querySelector(".start-game"),
        resetBtn: document.querySelector(".reset-game"),
        playerNameInput: document.querySelector(".player-name"),
        difficultySelect: document.querySelector(".difficulty-select"),
        categorySelect: document.querySelector(".category-select"),
        hintsLeftDisplay: document.querySelector(".hint-btn"),
        viewLeaderboardBtn: document.querySelector(".view-leaderboard"),
        backToGameBtn: document.querySelector(".back-to-game")
    };

    // Initialize game
    function init() {
        hideGameElements();
        setupEventListeners();
        loadLeaderboard();
    }

    function hideGameElements() {
        document.querySelector(".content").style.display = "none";
        document.querySelector(".game-over-message").style.display = "none";
        document.querySelector(".win-message").style.display = "none";
        document.querySelector(".leaderboard-container").style.display = "none";
        document.querySelector(".player-name-input").style.display = "block";
    }

    function setupEventListeners() {
        elements.startBtn.addEventListener("click", startGame);
        elements.checkBtn.addEventListener("click", checkWord);
        elements.refreshBtn.addEventListener("click", () => {
            generateWord();
        });
        elements.hintBtn.addEventListener("click", showHint);
        elements.inputField.addEventListener("keyup", (e) => {
            if (e.key === "Enter") checkWord();
        });
        
        // Reset game button (now in leaderboard)
        elements.resetBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset everything? This will clear all scores and start a new game.")) {
                localStorage.removeItem('wordScrambleLeaderboard');
                showWelcomeScreen();
                showNotification("Game has been reset and all scores cleared!", "info");
            }
        });

        // Leaderboard navigation
        const leaderboardButtons = document.querySelectorAll(".view-leaderboard");
        leaderboardButtons.forEach(button => {
            button.addEventListener("click", showLeaderboard);
        });
        
        elements.backToGameBtn.addEventListener("click", () => {
            hideLeaderboard();
        });
    }

    function startGame() {
        const name = elements.playerNameInput.value.trim();
        const category = elements.categorySelect.value;
        const difficulty = elements.difficultySelect.value;

        if (!name) {
            showNotification("Please enter your name!", "error");
            return;
        }
        if (!category) {
            showNotification("Please select a category!", "error");
            return;
        }
        if (!difficulty) {
            showNotification("Please select a difficulty!", "error");
            return;
        }

        // Show difficulty info
        showNotification(`${difficulty} Mode: ${gameConfig[difficulty].timeLimit} seconds per word, need ${gameConfig[difficulty].targetScore} points to win`, "info");

        // Reset game state
        gameState = {
            playerName: name,
            category: category,
            difficulty: difficulty,
            currentWord: '',
            correctWord: '',
            score: 0,
            targetScore: gameConfig[difficulty].targetScore,
            hintsLeft: 3,
            timeLeft: gameConfig[difficulty].timeLimit,
            totalTimeLeft: 0,  // Reset total time left
            timer: null,
            currentHints: [],
            hintIndex: 0,
            wordsUsed: new Set()
        };

        // Update display
        document.querySelector(".player-name-input").style.display = "none";
        document.querySelector(".content").style.display = "block";
        
        updateScoreDisplay();
        elements.targetScoreDisplay.textContent = gameState.targetScore;
        elements.hintsLeftDisplay.textContent = `Use Hint (${gameState.hintsLeft} Left)`;
        elements.timeText.textContent = gameState.timeLeft;

        // Start game
        generateWord();
        startTimer();
    }

    function updateScoreDisplay() {
        // Show only score progress
        elements.scoreDisplay.textContent = `Score: ${gameState.score}/${gameState.targetScore}`;
        elements.timeText.textContent = gameState.timeLeft;
        elements.hintsLeftDisplay.textContent = `Use Hint (${gameState.hintsLeft} Left)`;
    }

    function generateWord() {
        const categoryWords = questions[gameState.category][gameState.difficulty];
        let availableWords = categoryWords.filter(word => !gameState.wordsUsed.has(word.word));
        
        // If all words have been used, reset the used words
        if (availableWords.length === 0) {
            gameState.wordsUsed.clear();
            availableWords = categoryWords;
        }

        // Select a random word and its hints
        const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
        gameState.wordsUsed.add(randomWord.word);
        
        // Set up the new word
        gameState.correctWord = randomWord.word.toUpperCase();
        gameState.currentWord = scrambleWord(gameState.correctWord);
        gameState.currentHints = randomWord.hints;
        gameState.hintIndex = 0;

        // Make sure scrambled word is different from correct word
        while (gameState.currentWord === gameState.correctWord) {
            gameState.currentWord = scrambleWord(gameState.correctWord);
        }

        // Update display
        elements.wordDisplay.textContent = gameState.currentWord;
        elements.hintText.textContent = gameState.currentHints[0];
        elements.inputField.value = '';
        elements.inputField.focus();

        // Add animation
        elements.wordDisplay.classList.remove('bounce');
        void elements.wordDisplay.offsetWidth; // Trigger reflow
        elements.wordDisplay.classList.add('bounce');
    }

    function scrambleWord(word) {
        let scrambled;
        do {
            scrambled = word.split('')
                .sort(() => Math.random() - 0.5)
                .join('');
        } while (scrambled === word && word.length > 1);
        return scrambled;
    }

    function checkWord() {
        const userWord = elements.inputField.value.trim().toUpperCase();
        const correctWord = gameState.correctWord.toUpperCase();
        
        if (!userWord) {
            showNotification("Please enter a word!", "error");
            return;
        }

        // Remove any extra spaces and special characters for comparison
        const cleanUserWord = userWord.replace(/[^A-Z]/g, '');
        const cleanCorrectWord = correctWord.replace(/[^A-Z]/g, '');
        
        if (cleanUserWord === cleanCorrectWord) {
            // Add 1 point for correct answer
            gameState.score += 1;
            
            // Add remaining time to total time left
            gameState.totalTimeLeft += gameState.timeLeft;
            
            // Play success sound
            const correctSound = document.getElementById("correctSound");
            if (correctSound) correctSound.play();
            
            // Show success message with progress
            showNotification(`Correct! +1 point! (${gameState.score}/${gameState.targetScore})`, "success");
            
            // Update display
            updateScoreDisplay();
            
            // Check if player has reached target score
            if (gameState.score >= gameState.targetScore) {
                showWinMessage();
                return;
            }
            
            // Clear current word to allow generating new word
            gameState.currentWord = '';
            
            // Reset timer for next word
            resetTimer();
            elements.inputField.value = "";
            generateWord();
            elements.inputField.focus();
        } else {
            // Wrong answer
            const wrongSound = document.getElementById("wrongSound");
            if (wrongSound) wrongSound.play();
            
            // Visual feedback
            elements.inputField.classList.add("error-input");
            setTimeout(() => elements.inputField.classList.remove("error-input"), 500);
            
            // Reset timer for another try
            resetTimer();
            
            // Show error message
            showNotification(`Incorrect! Try unscrambling: ${gameState.currentWord}`, "error");
            
            // Clear input and focus
            elements.inputField.value = "";
            elements.inputField.focus();
        }
    }

    function startTimer() {
        // Clear any existing timer
        if (gameState.timer) {
            clearInterval(gameState.timer);
        }
        
        // Reset time to full based on difficulty
        gameState.timeLeft = gameConfig[gameState.difficulty].timeLimit;
        
        // Update display
        updateTimer();
        
        // Start new timer
        gameState.timer = setInterval(() => {
            gameState.timeLeft--;
            updateTimer();
            
            // Add warning when time is low
            if (gameState.timeLeft <= 5) {
                elements.timeText.parentElement.classList.add('urgent');
                if (gameState.timeLeft > 0) {
                    showNotification(`${gameState.timeLeft} seconds left!`, "warning");
                }
            }
            
            // End game if time runs out
            if (gameState.timeLeft <= 0) {
                gameOver();
            }
        }, 1000);
    }

    function resetTimer() {
        // Clear existing timer
        if (gameState.timer) {
            clearInterval(gameState.timer);
        }
        
        // Reset time to full based on difficulty
        gameState.timeLeft = gameConfig[gameState.difficulty].timeLimit;
        
        // Remove urgent class if it exists
        elements.timeText.parentElement.classList.remove('urgent');
        
        // Update display
        updateTimer();
        
        // Start new timer
        startTimer();
    }

    function updateTimer() {
        elements.timeText.textContent = gameState.timeLeft;
    }

    function showHint() {
        if (gameState.hintsLeft > 0) {
            gameState.hintsLeft--;
            gameState.hintIndex = (gameState.hintIndex + 1) % gameState.currentHints.length;
            const hint = gameState.currentHints[gameState.hintIndex];
            elements.hintsLeftDisplay.textContent = `Use Hint (${gameState.hintsLeft} Left)`;
            elements.hintText.textContent = hint;
            
            if (gameState.hintsLeft === 0) {
                elements.hintBtn.classList.add('disabled');
            }
            
            showNotification(hint, "info");
        } else {
            showNotification("No hints left!", "warning");
        }
    }

    function showWinMessage() {
        clearInterval(gameState.timer);
        
        // Calculate total time left (current time left + time left from previous words)
        gameState.totalTimeLeft += gameState.timeLeft;
        
        // Hide game container
        document.querySelector('.content').style.display = 'none';
        
        // Create and show win screen
        const winScreen = document.createElement('div');
        winScreen.className = 'game-over-screen';
        winScreen.innerHTML = `
            <div class="game-over-content">
                <h2>🎉 Congratulations! 🎉</h2>
                <div class="final-score">
                    <span>Final Score:</span>
                    <span class="score-value">${gameState.score}</span>
                </div>
                <div class="time-left">
                    <span>Time Left:</span>
                    <span class="time-value">${formatTime(gameState.totalTimeLeft)}</span>
                </div>
                <div class="game-over-buttons">
                    <button class="play-again-btn">
                        <i class="fas fa-redo"></i> Play Again
                    </button>
                    <button class="view-leaderboard-btn">
                        <i class="fas fa-trophy"></i> View Leaderboard
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(winScreen);
        
        // Add event listeners to buttons
        winScreen.querySelector('.play-again-btn').addEventListener('click', () => {
            winScreen.remove();
            showWelcomeScreen();
        });
        
        winScreen.querySelector('.view-leaderboard-btn').addEventListener('click', () => {
            // Save game data before redirecting
            const playerData = {
                name: gameState.playerName,
                score: gameState.score,
                category: gameState.category,
                difficulty: gameState.difficulty,
                timeLeft: gameState.totalTimeLeft,
                date: new Date().toISOString()
            };
            
            // Update leaderboard and redirect
            updateLeaderboard(playerData);
            window.location.href = 'leaderboards.html';
        });
    }

    function showGameOverScreen(score, timeLeft) {
        // Hide game container
        document.querySelector('.content').style.display = 'none';
        
        // Create and show game over screen
        const gameOverScreen = document.createElement('div');
        gameOverScreen.className = 'game-over-screen';
        gameOverScreen.innerHTML = `
            <div class="game-over-content">
                <h2>😢 Game Over!</h2>
                <div class="final-score">
                    <span>Final Score:</span>
                    <span class="score-value">${score}</span>
                </div>
                <div class="time-left">
                    <span>Time Left:</span>
                    <span class="time-value">${formatTime(timeLeft)}</span>
                </div>
                <div class="game-over-buttons">
                    <button class="play-again-btn">
                        <i class="fas fa-redo"></i> Play Again
                    </button>
                    <button class="view-leaderboard-btn">
                        <i class="fas fa-trophy"></i> View Leaderboard
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(gameOverScreen);
        
        // Add event listeners to buttons
        gameOverScreen.querySelector('.play-again-btn').addEventListener('click', () => {
            gameOverScreen.remove();
            showWelcomeScreen();
        });
        
        gameOverScreen.querySelector('.view-leaderboard-btn').addEventListener('click', () => {
            // Save game data before redirecting
            const playerData = {
                name: gameState.playerName,
                score: score,
                category: gameState.category,
                difficulty: gameState.difficulty,
                timeLeft: timeLeft,
                date: new Date().toISOString()
            };
            
            // Update leaderboard and redirect
            updateLeaderboard(playerData);
            window.location.href = 'leaderboards.html';
        });
    }

    function gameOver() {
        clearInterval(gameState.timer);
        const finalScore = gameState.score;
        const timeLeft = gameState.totalTimeLeft;
        showGameOverScreen(finalScore, timeLeft);
    }

    function updateLeaderboard(playerData) {
        // Get existing leaderboard data or initialize empty array
        let leaderboard = JSON.parse(localStorage.getItem('wordScrambleLeaderboard')) || [];
        
        // Format the player data
        const formattedData = {
            name: playerData.name,
            score: playerData.score,
            category: playerData.category,
            difficulty: playerData.difficulty,
            timeLeft: playerData.timeLeft,
            date: new Date().toISOString()
        };
        
        // Add new score
        leaderboard.push(formattedData);
        
        // Sort by score (highest first)
        leaderboard.sort((a, b) => b.score - a.score);
        
        // Keep only top 10 scores
        leaderboard = leaderboard.slice(0, 10);
        
        // Save to localStorage
        localStorage.setItem('wordScrambleLeaderboard', JSON.stringify(leaderboard));
        
        // Update the leaderboard display if we're on the leaderboard page
        if (document.querySelector('.leaderboard-table')) {
            displayLeaderboard(leaderboard);
        }
    }

    function displayLeaderboard(leaderboard) {
        const tableBody = document.querySelector('.leaderboard-table .table-body');
        if (!tableBody) return;

        // Clear existing content
        tableBody.innerHTML = '';

        // Add each player to the table
        leaderboard.forEach((player, index) => {
            const row = document.createElement('div');
            row.className = `table-row ${index < 3 ? 'top-player' : ''}`;
            
            row.innerHTML = `
                <div class="rank-col">
                    <div class="rank-badge ${getRankClass(index + 1)}">${index + 1}</div>
                </div>
                <div class="player-col">
                    <img src="https://api.dicebear.com/6.x/avataaars/svg?seed=${player.name}" alt="${player.name}" class="player-avatar">
                    <div class="player-info">
                        <span class="player-name">${player.name}</span>
                        <span class="player-title">${getPlayerTitle(player.score)}</span>
                    </div>
                </div>
                <div class="score-col">${player.score.toLocaleString()}</div>
                <div class="category-col">${player.category}</div>
                <div class="difficulty-col">${player.difficulty}</div>
                <div class="time-col">${formatTime(player.timeLeft)}</div>
            `;
            
            tableBody.appendChild(row);
        });
    }

    // Helper function to format time
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Helper function to get rank class
    function getRankClass(rank) {
        switch(rank) {
            case 1: return 'gold';
            case 2: return 'silver';
            case 3: return 'bronze';
            default: return '';
        }
    }

    // Helper function to get player title
    function getPlayerTitle(score) {
        if (score >= 9000) return "Grandmaster";
        if (score >= 8000) return "Expert";
        if (score >= 7000) return "Professional";
        if (score >= 6000) return "Advanced";
        return "Intermediate";
    }

    function checkAchievements() {
        const achievements = [];
        
        // Perfect score achievement
        if (gameState.score === gameState.targetScore) {
            achievements.push({
                title: "Perfect Score!",
                description: "Reached the target score!",
                icon: "🏆"
            });
        }
        
        // Speed demon achievement
        if (gameState.timeLeft > gameConfig[gameState.difficulty].timeLimit / 2) {
            achievements.push({
                title: "Speed Demon",
                description: "Completed with more than 50% time remaining",
                icon: "⚡"
            });
        }
        
        // Hint master achievement
        if (gameState.hintsLeft === 3) {
            achievements.push({
                title: "Hint Master",
                description: "Completed without using any hints",
                icon: "🎯"
            });
        }
        
        // Display achievements
        if (achievements.length > 0) {
            const container = document.querySelector(".achievements");
            const badgesContainer = container.querySelector(".badges-container");
            
            badgesContainer.innerHTML = achievements.map(achievement => `
                <div class="badge animated bounceIn">
                    <div class="badge-icon">${achievement.icon}</div>
                    <div class="badge-title">${achievement.title}</div>
                    <div class="badge-description">${achievement.description}</div>
                </div>
            `).join('');
            
            container.style.display = "block";
        }
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type} animated bounceInRight`;
        
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'info' ? 'ℹ️' : '⚠️';
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.replace('bounceInRight', 'bounceOutRight');
            setTimeout(() => notification.remove(), 1000);
        }, 2000);
    }

    function resetGame() {
        // Clear the timer
        if (gameState.timer) {
            clearInterval(gameState.timer);
        }

        // Reset game state while preserving player settings
        const preservedSettings = {
            playerName: gameState.playerName,
            category: gameState.category,
            difficulty: gameState.difficulty
        };

        // Reset game state to initial values
        gameState = {
            ...preservedSettings,
            currentWord: '',
            correctWord: '',
            score: 0,
            targetScore: gameConfig[preservedSettings.difficulty].targetScore,
            hintsLeft: 3,
            timeLeft: gameConfig[preservedSettings.difficulty].timeLimit,
            totalTimeLeft: 0,  // Reset total time left
            timer: null,
            currentHints: [],
            hintIndex: 0,
            wordsUsed: new Set()
        };

        // Update display
        updateScoreDisplay();
        elements.targetScoreDisplay.textContent = gameState.targetScore;
        elements.hintsLeftDisplay.textContent = `Use Hint (${gameState.hintsLeft} Left)`;
        elements.timeText.textContent = gameState.timeLeft;
        elements.inputField.value = '';
        elements.hintBtn.classList.remove('disabled');
        elements.timeText.parentElement.classList.remove('urgent');

        // Generate new word and start timer
        generateWord();
        startTimer();
    }

    function showWelcomeScreen() {
        hideGameElements();
        document.querySelector(".player-name-input").style.display = "block";
        
        // Clear game state completely
        gameState = {
            playerName: '',
            category: '',
            difficulty: '',
            currentWord: '',
            correctWord: '',
            score: 0,
            targetScore: 0,
            hintsLeft: 3,
            timeLeft: 0,
            totalTimeLeft: 0,  // Reset total time left
            timer: null,
            currentHints: [],
            hintIndex: 0,
            wordsUsed: new Set()
        };
        
        // Clear any existing timer
        if (gameState.timer) {
            clearInterval(gameState.timer);
            gameState.timer = null;
        }
    }

    function showLeaderboard() {
        // Redirect to leaderboard page
        window.location.href = 'leaderboards.html';
    }

    function hideLeaderboard() {
        document.querySelector(".leaderboard-container").style.display = "none";
        // Always show welcome screen when going back
        showWelcomeScreen();
    }

    // Initialize the game
    init();

    // Add CSS for game over screen
    const style = document.createElement('style');
    style.textContent = `
        .game-over-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(8px);
        }
        
        .game-over-content {
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            padding: 3.5rem;
            border-radius: 30px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 2px solid rgba(33, 150, 243, 0.2);
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translate(-50%, -60%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
        
        .game-over-content h2 {
            color: var(--text);
            font-size: 3.5rem;
            margin-bottom: 2.5rem;
            font-family: 'Space Grotesk', sans-serif;
            background: linear-gradient(135deg, #fff, #e0e0e0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            letter-spacing: 1px;
        }
        
        .final-score, .time-left {
            margin: 1.8rem auto;
            font-size: 1.5rem;
            color: var(--text-muted);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1.2rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 400px;
        }

        .final-score:hover, .time-left:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(5px);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        .score-value, .time-value {
            color: var(--text);
            font-weight: 700;
            font-size: 1.8rem;
            font-family: 'Space Grotesk', sans-serif;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .game-over-buttons {
            display: flex;
            gap: 2rem;
            justify-content: center;
            margin-top: 3rem;
            flex-wrap: wrap;
        }
        
        .game-over-buttons button {
            padding: 1.2rem 2.5rem;
            border: none;
            border-radius: 15px;
            font-size: 1.2rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.3s ease;
            min-width: 200px;
            justify-content: center;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            position: relative;
            overflow: hidden;
        }
        
        .play-again-btn {
            background: linear-gradient(135deg, #2196f3, #9c27b0);
            color: white;
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.4);
        }
        
        .view-leaderboard-btn {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
        }
        
        .game-over-buttons button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
        }

        .game-over-buttons button:active {
            transform: translateY(1px);
        }

        .game-over-buttons button i {
            font-size: 1.4rem;
        }
        
        @media (max-width: 480px) {
            .game-over-content {
                padding: 2.5rem;
                width: 95%;
            }

            .game-over-content h2 {
                font-size: 2.8rem;
            }

            .final-score, .time-left {
                font-size: 1.3rem;
                padding: 0.8rem;
                margin: 1.5rem auto;
            }

            .score-value, .time-value {
                font-size: 1.6rem;
            }

            .game-over-buttons {
                flex-direction: column;
                gap: 1.2rem;
            }
            
            .game-over-buttons button {
                width: 100%;
                padding: 1rem 2rem;
                font-size: 1.1rem;
                min-width: unset;
            }
        }
    `;
    document.head.appendChild(style);
}); 

