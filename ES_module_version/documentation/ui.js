/*
 * ui.js: draws the puzzle in the browser and handles mouse/touch input.
 *
 * All game rules live in logic.js; this file only turns that state into
 * HTML elements and reacts to the player.
 *
 * How to play (as implemented here):
 *   - Press on a piece and drag it. Release over the board to place it.
 *   - While dragging: Q rotates, W flips top-to-bottom, E flips
 *     left-to-right.
 *   - Dragging a placed piece off the board returns it to the piece tray.
 *   - Reset button: puts everything back. Filling the board shows a win
 *     message.
 *
 * Expects the page to contain elements with the classes: .board, .pieces,
 * .reset-button and .win-message.
 */

//UI
import logic from "./logic.js";


// Information about the piece currently being dragged, or null when
// nothing is being dragged. Fields: id, element, originalPosition (board
// position it was lifted from, or null if it came from the tray), and
// offsetX / offsetY (where inside the piece the pointer grabbed it).
let draggedPiece = null;

/* ---------- Drawing ---------- */

const boardElement = document.querySelector(".board");
/** Fill the board with empty cell <div>s (height x width of them). */
function renderBoard() {
    for (let y = 0; y < logic.BOARD_HEIGHT; y++) {
        for (let x = 0; x < logic.BOARD_WIDTH; x++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            boardElement.appendChild(cell);
        }
    }
}


const piecesElement = document.querySelector(".pieces");
/**
 * Create one element for each piece, add it to the tray, and attach the
 * pointerdown handler that starts a drag. Called once when the page loads.
 */
function renderPieces() {
    for (const pieceId in logic.pieces) {
        const pieceElement = document.createElement("div");
        pieceElement.dataset.pieceId = pieceId;
        pieceElement.classList.add("piece");

        const shape = logic.pieces[pieceId];

        // Size the piece's own CSS grid to the shape's bounding box
        const maxX = Math.max(...shape.map(point => point[0]));
        const maxY = Math.max(...shape.map(point => point[1]));

        pieceElement.style.display = "grid";
        pieceElement.style.gridTemplateColumns = `repeat(${maxX + 1}, 70px)`;
        pieceElement.style.gridTemplateRows = `repeat(${maxY + 1}, 70px)`;

        // One square per cell of the shape, placed in the grid by [x, y]
        // (CSS grid lines start at 1, hence the + 1)
        for (const [x, y] of shape) {
            const cell = document.createElement("div");
            cell.classList.add("piece-cell");

            cell.style.gridColumn = x + 1;
            cell.style.gridRow = y + 1;

            pieceElement.appendChild(cell);
        }

        piecesElement.appendChild(pieceElement);

        // Start dragging: remember which piece it is and where on the
        // piece the pointer grabbed it, so the piece doesn't jump.
        pieceElement.addEventListener("pointerdown", function(event) {
            const rect = pieceElement.getBoundingClientRect();

            draggedPiece = {
                id: pieceId,
                element: pieceElement,
                // Copy of the board position, or null if it was in the tray
                originalPosition: logic.piecePositions[pieceId] === null
                    ? null
                    : [...logic.piecePositions[pieceId]],
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };

            // Keep receiving pointer events even if the pointer leaves the
            // element while dragging
            pieceElement.setPointerCapture(event.pointerId);

            // A piece being moved is taken off the board in the game state
            // so it doesn't block its own new position.
            if (draggedPiece.originalPosition !== null) {
                logic.removePiece(pieceId);
            }
        });
    }
}

/**
 * Show a piece on the board at a board position. The element is moved
 * into the board and placed with absolute positioning.
 * 72 = 70px cell + 2px gap (see .board in style.css).
 */
function renderPlacedPiece(pieceElement, position) {
    const [x, y] = position;

    boardElement.appendChild(pieceElement);

    pieceElement.style.position = "absolute";
    pieceElement.style.left = `${x * 72}px`;
    pieceElement.style.top = `${y * 72}px`;
}

/**
 * Redraw a piece's squares from its current shape in logic.pieces.
 * Used after a rotation/flip and after a reset.
 */
function renderPieceShape(pieceElement, pieceId) {
    const shape = logic.pieces[pieceId];

    const maxX = Math.max(...shape.map(point => point[0]));
    const maxY = Math.max(...shape.map(point => point[1]));

    pieceElement.style.gridTemplateColumns = `repeat(${maxX + 1}, 70px)`;
    pieceElement.style.gridTemplateRows = `repeat(${maxY + 1}, 70px)`;

    // Remove the old squares, then add new ones
    pieceElement.replaceChildren();

    for (const [x, y] of shape) {
        const cell = document.createElement("div");
        cell.classList.add("piece-cell");

        cell.style.gridColumn = x + 1;
        cell.style.gridRow = y + 1;

        pieceElement.appendChild(cell);
    }
}

/* ---------- Dragging ---------- */

// While dragging, the piece follows the pointer. position: fixed places it
// relative to the browser window.
document.addEventListener("pointermove", function(event) {
    if (draggedPiece === null) return;

    draggedPiece.element.style.position = "fixed";

    draggedPiece.element.style.left =
        `${event.clientX - draggedPiece.offsetX}px`;

    draggedPiece.element.style.top =
        `${event.clientY - draggedPiece.offsetY}px`;
});

// Releasing the pointer: work out where the piece was dropped, then decide
// what to do with it.
document.addEventListener("pointerup", function(event) {
    if (draggedPiece === null) return;

    const boardRect = boardElement.getBoundingClientRect();
    const pieceRect = draggedPiece.element.getBoundingClientRect();
    const cellSize = 70;
    const cellGap = 2;
    const cellStep = cellSize + cellGap;

    // Snap the piece's top-left corner to the nearest board cell
    const x = Math.round((pieceRect.left - boardRect.left) / cellStep);
    const y = Math.round((pieceRect.top - boardRect.top) / cellStep);

    const targetPosition = [x, y];
    // True when the piece doesn't overlap the board area at all
    const isOutsideBoard =
    pieceRect.right < boardRect.left ||
    pieceRect.left > boardRect.right ||
    pieceRect.bottom < boardRect.top ||
    pieceRect.top > boardRect.bottom;

    const isValid = logic.canPlacePiece(
        logic.pieces[draggedPiece.id],
        targetPosition
    );

    // Case 1: a placed piece was dragged off the board -> back to the tray
    if (isOutsideBoard && draggedPiece.originalPosition !== null) {
        piecesElement.appendChild(draggedPiece.element);

        // Clear the inline positioning so the tray layout takes over again
        draggedPiece.element.style.position = "";
        draggedPiece.element.style.left = "";
        draggedPiece.element.style.top = "";

        draggedPiece = null;
    }
    // Case 2: a tray piece was dropped somewhere invalid -> stays in the tray
    else if (!isValid && draggedPiece.originalPosition === null) {
        draggedPiece.element.style.position = "";
        draggedPiece.element.style.left = "";
        draggedPiece.element.style.top = "";
        draggedPiece = null;
    }
    // Case 3: a placed piece was dropped somewhere invalid -> back to where
    // it was on the board
    else if (!isValid && draggedPiece.originalPosition !== null) {
        logic.placePiece(draggedPiece.originalPosition, draggedPiece.id);

        renderPlacedPiece(
                draggedPiece.element,
                draggedPiece.originalPosition
        );

        draggedPiece = null;
    }
    // Case 4: valid spot -> place it, and check whether the puzzle is solved
    else if (isValid) {
        logic.placePiece(targetPosition, draggedPiece.id);
        renderPlacedPiece(draggedPiece.element, targetPosition);
        draggedPiece = null;
        if (logic.isBoardFull()) {
            showWinMessage();
        }
    }
});

// Keyboard controls, only active while a piece is being dragged:
//   Q = rotate, W = flip top-to-bottom, E = flip left-to-right
document.addEventListener("keydown", function(event) {
    if (draggedPiece === null) return;

    const key = event.key.toLowerCase();
    // Ignore the repeats fired while a key is held down
    if (event.repeat) return;
    if (key === "q") {
        logic.transformPiece(draggedPiece.id, "rotate");
        renderPieceShape(draggedPiece.element, draggedPiece.id);
    }
    else if (key === "w") {
        logic.transformPiece(draggedPiece.id, "reflectV");
        renderPieceShape(draggedPiece.element, draggedPiece.id);
    }
    else if (key === "e") {
        logic.transformPiece(draggedPiece.id, "reflectH");
        renderPieceShape(draggedPiece.element, draggedPiece.id);
    }
});



// The browser can cancel a drag (e.g. a touch gesture is taken over). Put
// the piece back where it came from: the tray, or its old board position.
document.addEventListener("pointercancel", function(event) {
    if (draggedPiece === null) return;

    if (draggedPiece.originalPosition === null) {
        piecesElement.appendChild(draggedPiece.element);

        draggedPiece.element.style.position = "";
        draggedPiece.element.style.left = "";
        draggedPiece.element.style.top = "";
    }
    else {
        logic.placePiece(draggedPiece.originalPosition, draggedPiece.id);

        renderPlacedPiece(
            draggedPiece.element,
            draggedPiece.originalPosition
        );
    }

    draggedPiece = null;
});


/* ---------- Reset and win ---------- */

// Reset button: clear the game state, send every piece back to the tray
// and redraw its original shape. Ignored while a piece is being dragged.
const resetButton = document.querySelector(".reset-button");
resetButton.addEventListener("click", function() {
    if (draggedPiece !== null) return;
    logic.resetGame();

    const allPieces = document.querySelectorAll(".piece");
    for (const pieceElement of allPieces) {
        piecesElement.appendChild(pieceElement);

        pieceElement.style.position = "";
        pieceElement.style.left = "";
        pieceElement.style.top = "";

        const pieceId = pieceElement.dataset.pieceId;

        renderPieceShape(pieceElement, pieceId);
    }
});


// Play the win animation (defined in style.css as .win-message.show).
const winMessageElement = document.querySelector(".win-message");
function showWinMessage() {
    // Remove the class, force a reflow (reading offsetWidth), then add it
    // again. This restarts the CSS animation if it is already playing.
    winMessageElement.classList.remove("show");
    void winMessageElement.offsetWidth;
    winMessageElement.classList.add("show");
}

// Build the page when it loads
renderPieces();
renderBoard();
