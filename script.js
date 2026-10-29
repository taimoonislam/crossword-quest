
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);

  const gridElement = $("#crosswordGrid");
  const scoreElement = $("#score");
  const timerElement = $("#timer");
  const puzzleNumberElement = $("#puzzleNumber");
  const progressLabel = $("#progressLabel");
  const progressBar = $("#progressBar");
  const messageElement = $("#gameMessage");
  const clueListElement = $("#clueList");
  const activeClueNumber = $(".active-clue-number");
  const activeClueText = $("#activeClueText");

  const acrossTab = $("#acrossTab");
  const downTab = $("#downTab");
  const checkButton = $("#checkBtn");
  const hintButton = $("#hintBtn");
  const revealButton = $("#revealBtn");
  const clearButton = $("#clearBtn");
  const newGameButton = $("#newGameBtn");
  const winModal = $("#winModal");
  const winSummary = $("#winSummary");
  const finalScore = $("#finalScore");
  const finalTime = $("#finalTime");
  const playAgainButton = $("#playAgainBtn");

  if (!gridElement) {
    console.error(
      'Crossword grid not found. index.html-e id="crosswordGrid" ache kina check koro.'
    );
    return;
  }

  const SIZE = 7;

  const puzzles = [
    {
      across: [
        { row: 2, col: 1, answer: "CAT", clue: "A pet that says meow." },
        { row: 4, col: 1, answer: "HEN", clue: "A bird that lays eggs." }
      ],
      down: [
        { row: 1, col: 2, answer: "BATE", clue: "To lessen or reduce (as in abate, shortened)." },
        { row: 1, col: 3, answer: "ATE", clue: "Past tense of eat." }
      ]
    },
    {
      across: [
        { row: 2, col: 1, answer: "BAT", clue: "A flying mammal, or a cricket tool." },
        { row: 4, col: 1, answer: "MEN", clue: "Plural of man." }
      ],
      down: [
        { row: 1, col: 2, answer: "BARE", clue: "Without covering." },
        { row: 1, col: 3, answer: "ATE", clue: "Past tense of eat." }
      ]
    },
    {
      across: [
        { row: 2, col: 1, answer: "HAT", clue: "Something you wear on your head." },
        { row: 4, col: 1, answer: "PEN", clue: "A tool for writing." }
      ],
      down: [
        { row: 1, col: 2, answer: "CAPE", clue: "A superhero may wear one." },
        { row: 1, col: 3, answer: "ATE", clue: "Past tense of eat." }
      ]
    }
  ];

  let puzzleIndex = 0;
  let puzzle = null;
  let cells = [];
  let entries = [];
  let selectedCell = null;
  let selectedDirection = "across";
  let score = 0;
  let seconds = 0;
  let timerId = null;
  let gameFinished = false;
  let hintsUsed = 0;

  function showMessage(message, type = "") {
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.className = "game-message";
    if (type) messageElement.classList.add(type);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateTimer() {
    if (timerElement) timerElement.textContent = formatTime(seconds);
  }

  function updateScore() {
    if (scoreElement) scoreElement.textContent = String(score);
  }

  function updateProgress() {
    const completed = entries.filter(isEntryCorrect).length;
    const total = entries.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    if (progressLabel) {
      progressLabel.textContent = `${completed} / ${total} completed`;
    }

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
      progressBar.setAttribute("aria-valuenow", String(percent));
    }
  }

  function validatePuzzle(data) {
    const letters = new Map();

    for (const direction of ["across", "down"]) {
      for (const entry of data[direction]) {
        entry.answer = entry.answer.toUpperCase();

        if (!/^[A-Z]+$/.test(entry.answer)) {
          throw new Error(`Invalid answer: ${entry.answer}`);
        }

        for (let i = 0; i < entry.answer.length; i++) {
          const row = entry.row + (direction === "down" ? i : 0);
          const col = entry.col + (direction === "across" ? i : 0);

          if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
            throw new Error(`Word ${entry.answer} goes outside the grid.`);
          }

          const key = `${row},${col}`;
          const letter = entry.answer[i];

          if (letters.has(key) && letters.get(key) !== letter) {
            throw new Error(
              `Crossing mismatch at row ${row + 1}, column ${col + 1}.`
            );
          }

          letters.set(key, letter);
        }
      }
    }
  }

  function buildPuzzle() {
    puzzle = puzzles[puzzleIndex];
    validatePuzzle(puzzle);

    entries = [];
    cells = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => null)
    );

    for (const direction of ["across", "down"]) {
      for (const source of puzzle[direction]) {
        const entry = {
          ...source,
          direction,
          number: 0,
          inputs: [],
          completed: false
        };

        for (let i = 0; i < entry.answer.length; i++) {
          const row = entry.row + (direction === "down" ? i : 0);
          const col = entry.col + (direction === "across" ? i : 0);

          if (!cells[row][col]) {
            cells[row][col] = {
              row,
              col,
              answer: entry.answer[i],
              entries: [],
              input: null,
              wrapper: null
            };
          }

          const cell = cells[row][col];

          if (cell.answer !== entry.answer[i]) {
            throw new Error("Crossword crossing letters do not match.");
          }

          cell.entries.push(entry);
          entry.inputs.push(cell);
        }

        entries.push(entry);
      }
    }

    const starts = new Map();

    entries
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .forEach((entry) => {
        const key = `${entry.row},${entry.col}`;
        if (!starts.has(key)) starts.set(key, starts.size + 1);
        entry.number = starts.get(key);
      });

    renderGrid();
    renderClues();
    updateProgress();

    if (puzzleNumberElement) {
      puzzleNumberElement.textContent = String(puzzleIndex + 1);
    }
  }

  function renderGrid() {
    gridElement.innerHTML = "";
    gridElement.style.display = "grid";
    gridElement.style.gridTemplateColumns = `repeat(${SIZE}, minmax(0, 1fr))`;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = cells[row][col];

        const wrapper = document.createElement("div");
        wrapper.className = cell ? "cell-wrapper" : "cell-wrapper block";

        if (!cell) {
          wrapper.setAttribute("aria-hidden", "true");
          gridElement.appendChild(wrapper);
          continue;
        }

        cell.wrapper = wrapper;

        const startingEntry = entries.find(
          (entry) => entry.row === row && entry.col === col
        );

        if (startingEntry) {
          const numberBadge = document.createElement("span");
          numberBadge.className = "cell-number";
          numberBadge.textContent = String(startingEntry.number);
          wrapper.appendChild(numberBadge);
        }

        const input = document.createElement("input");
        input.className = "cell";
        input.type = "text";
        input.maxLength = 1;
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);

        input.addEventListener("focus", () => selectCell(cell, false));
        input.addEventListener("click", () => selectCell(cell, true));

        input.addEventListener("keydown", (event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveFocus(cell.row, cell.col + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveFocus(cell.row, cell.col - 1);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            moveFocus(cell.row + 1, cell.col);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveFocus(cell.row - 1, cell.col);
          } else if (event.key === "Backspace") {
            event.preventDefault();
            if (input.value) {
              input.value = "";
              updateProgress();
            } else {
              moveInEntry(-1);
            }
          } else if (event.key === "Tab") {
            event.preventDefault();
            moveToNextEntry(event.shiftKey ? -1 : 1);
          } else if (/^[a-zA-Z]$/.test(event.key)) {
            event.preventDefault();
            input.value = event.key.toUpperCase();
            updateProgress();
            moveInEntry(1);
            checkWin();
          }
        });

        cell.input = input;
        wrapper.appendChild(input);
        gridElement.appendChild(wrapper);
      }
    }
  }

  function renderClues() {
    if (!clueListElement) return;
    clueListElement.innerHTML = "";

    const visibleEntries = entries.filter(
      (entry) => entry.direction === selectedDirection
    );

    visibleEntries.forEach((entry) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "clue-item";
      item.dataset.number = String(entry.number);
      item.dataset.direction = entry.direction;

      const number = document.createElement("span");
      number.className = "clue-number";
      number.textContent = String(entry.number);

      const content = document.createElement("span");
      content.className = "clue-content";

      const clueText = document.createElement("span");
      clueText.className = "clue-text";
      clueText.textContent = entry.clue;

      const length = document.createElement("span");
      length.className = "clue-length";
      length.textContent = `${entry.answer.length} letters`;

      content.append(clueText, length);
      item.append(number, content);

      item.addEventListener("click", () => {
        selectedDirection = entry.direction;
        selectCell(entry.inputs[0], false);
        focusEntry(entry);
      });

      clueListElement.appendChild(item);
    });

    updateClueHighlight();
  }

  function selectCell(cell, allowDirectionToggle = false) {
    if (!cell) return;

    if (
      allowDirectionToggle &&
      selectedCell === cell &&
      cell.entries.length > 1
    ) {
      selectedDirection =
        selectedDirection === "across" ? "down" : "across";
    }

    selectedCell = cell;

    if (!cell.entries.some((entry) => entry.direction === selectedDirection)) {
      selectedDirection = cell.entries[0]?.direction || "across";
    }

    updateHighlight();
    updateActiveClue();
  }

  function getSelectedEntry() {
    if (!selectedCell) return null;

    return (
      selectedCell.entries.find(
        (entry) => entry.direction === selectedDirection
      ) || selectedCell.entries[0] || null
    );
  }

  function updateHighlight() {
    document.querySelectorAll(".cell-wrapper").forEach((wrapper) => {
      wrapper.classList.remove("selected", "word-highlight");
    });

    document.querySelectorAll(".cell").forEach((input) => {
      input.classList.remove("selected", "word-highlight");
    });

    const entry = getSelectedEntry();

    if (entry) {
      entry.inputs.forEach((cell) => {
        cell.wrapper?.classList.add("word-highlight");
        cell.input?.classList.add("word-highlight");
      });
    }

    if (selectedCell) {
      selectedCell.wrapper?.classList.add("selected");
      selectedCell.input?.classList.add("selected");
    }

    updateClueHighlight();
  }

  function updateClueHighlight() {
    const activeEntry = getSelectedEntry();

    document.querySelectorAll(".clue-item").forEach((item) => {
      const matches =
        activeEntry &&
        item.dataset.number === String(activeEntry.number) &&
        item.dataset.direction === activeEntry.direction;

      item.classList.toggle("active", Boolean(matches));
      item.classList.toggle(
        "completed",
        Boolean(
          entries.find(
            (entry) =>
              entry.number === Number(item.dataset.number) &&
              entry.direction === item.dataset.direction &&
              isEntryCorrect(entry)
          )
        )
      );
    });
  }

  function updateActiveClue() {
    const entry = getSelectedEntry();

    if (activeClueNumber) {
      activeClueNumber.textContent = entry ? String(entry.number) : "—";
    }

    if (activeClueText) {
      activeClueText.textContent = entry
        ? entry.clue
        : "Select a clue to begin.";
    }

    updateClueHighlight();
  }

  function focusEntry(entry) {
    if (!entry || !entry.inputs.length) return;
    const next = entry.inputs.find((cell) => !cell.input.value) || entry.inputs[0];
    next.input.focus();
    selectCell(next, false);
  }

  function moveFocus(row, col) {
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;
    const cell = cells[row][col];
    if (cell?.input) {
      cell.input.focus();
      selectCell(cell, false);
    }
  }

  function moveInEntry(offset) {
    const entry = getSelectedEntry();
    if (!entry) return;

    const index = entry.inputs.findIndex((cell) => cell === selectedCell);
    const next = entry.inputs[index + offset];

    if (next) {
      next.input.focus();
      selectCell(next, false);
    }
  }

  function moveToNextEntry(offset = 1) {
    const sameDirection = entries.filter(
      (entry) => entry.direction === selectedDirection
    );
    if (!sameDirection.length) return;

    const current = getSelectedEntry();
    const index = sameDirection.indexOf(current);
    const nextIndex = (index + offset + sameDirection.length) % sameDirection.length;
    focusEntry(sameDirection[nextIndex]);
  }

  function isEntryCorrect(entry) {
    return entry.inputs.every(
      (cell) => cell.input && cell.input.value.toUpperCase() === cell.answer
    );
  }

  function checkAnswers() {
    let correct = 0;
    let incorrect = 0;
    let empty = 0;

    entries.forEach((entry) => {
      entry.inputs.forEach((cell) => {
        const value = cell.input.value.toUpperCase();

        cell.input.classList.remove("correct", "incorrect");

        if (!value) {
          empty++;
        } else if (value === cell.answer) {
          correct++;
          cell.input.classList.add("correct");
        } else {
          incorrect++;
          cell.input.classList.add("incorrect");
        }
      });
    });

    updateProgress();

    if (empty === 0 && incorrect === 0) {
      showMessage("Perfect! Sob answer thik! 🎉", "success");
      checkWin();
    } else {
      showMessage(
        `${correct} ta letter thik, ${incorrect} ta bhul, ${empty} ta khali.`,
        incorrect ? "error" : ""
      );
    }
  }

  function giveHint() {
    if (gameFinished) return;

    const entry = getSelectedEntry();
    if (!entry) {
      showMessage("Age ekta clue select koro.");
      return;
    }

    const target =
      entry.inputs.find((cell) => !cell.input.value) || selectedCell;

    if (!target) return;

    target.input.value = target.answer;
    target.input.classList.remove("incorrect");
    target.input.classList.add("correct");

    hintsUsed++;
    score = Math.max(0, score - 5);
    updateScore();
    updateProgress();

    showMessage("Hint used! Ekta letter reveal kora holo. 💡");
    moveInEntry(1);
    checkWin();
  }

  function revealWord() {
    if (gameFinished) return;

    const entry = getSelectedEntry();
    if (!entry) {
      showMessage("Age ekta clue select koro.");
      return;
    }

    entry.inputs.forEach((cell) => {
      cell.input.value = cell.answer;
      cell.input.classList.remove("incorrect");
      cell.input.classList.add("correct");
    });

    score = Math.max(0, score - 15);
    updateScore();
    updateProgress();
    showMessage(`Word revealed: ${entry.answer}`);
    checkWin();
  }

  function clearWord() {
    const entry = getSelectedEntry();
    if (!entry) return;

    entry.inputs.forEach((cell) => {
      cell.input.value = "";
      cell.input.classList.remove("correct", "incorrect");
    });

    updateProgress();
    showMessage("Selected word clear kora hoyeche.");
    focusEntry(entry);
  }

  function checkWin() {
    if (gameFinished || !entries.every(isEntryCorrect)) return;

    gameFinished = true;
    clearInterval(timerId);

    const timeBonus = Math.max(0, 300 - seconds);
    score += Math.round(100 + timeBonus / 10);
    updateScore();
    updateProgress();

    if (winSummary) {
      winSummary.textContent = `Puzzle ${puzzleIndex + 1} complete!`;
    }
    if (finalScore) finalScore.textContent = String(score);
    if (finalTime) finalTime.textContent = formatTime(seconds);

    if (winModal) {
      winModal.classList.add("show", "active");
      winModal.setAttribute("aria-hidden", "false");
    }

    showMessage("Puzzle complete! Excellent work! 🏆", "success");
  }

  function closeWinModal() {
    if (!winModal) return;
    winModal.classList.remove("show", "active");
    winModal.setAttribute("aria-hidden", "true");
  }

  function startGame(nextPuzzle = false) {
    clearInterval(timerId);

    if (nextPuzzle) {
      puzzleIndex = (puzzleIndex + 1) % puzzles.length;
    }

    score = 0;
    seconds = 0;
    hintsUsed = 0;
    gameFinished = false;
    selectedCell = null;
    selectedDirection = "across";

    updateScore();
    updateTimer();
    closeWinModal();
    showMessage("Clue select kore word solve koro!");

    try {
      buildPuzzle();
    } catch (error) {
      console.error("Crossword setup error:", error);
      showMessage(`Puzzle setup error: ${error.message}`, "error");
      return;
    }

    timerId = setInterval(() => {
      if (gameFinished) return;
      seconds++;
      updateTimer();
    }, 1000);

    const firstAcross = entries.find((entry) => entry.direction === "across");
    if (firstAcross) focusEntry(firstAcross);
  }

  if (acrossTab) {
    acrossTab.addEventListener("click", () => {
      selectedDirection = "across";
      renderClues();
      updateActiveClue();
      updateHighlight();
    });
  }

  if (downTab) {
    downTab.addEventListener("click", () => {
      selectedDirection = "down";
      renderClues();
      updateActiveClue();
      updateHighlight();
    });
  }

  if (checkButton) checkButton.addEventListener("click", checkAnswers);
  if (hintButton) hintButton.addEventListener("click", giveHint);
  if (revealButton) revealButton.addEventListener("click", revealWord);
  if (clearButton) clearButton.addEventListener("click", clearWord);
  if (newGameButton) newGameButton.addEventListener("click", () => startGame(true));
  if (playAgainButton) playAgainButton.addEventListener("click", () => startGame(true));

  startGame(false);
});
