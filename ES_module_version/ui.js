//UI
import logic from "./logic.js";


let draggedPiece = null;

const boardElement = document.querySelector(".board");
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
function renderPieces() {
    for (const pieceId in logic.pieces) {
        const pieceElement = document.createElement("div");
        pieceElement.dataset.pieceId = pieceId;
        pieceElement.classList.add("piece");

        const shape = logic.pieces[pieceId];

        const maxX = Math.max(...shape.map(point => point[0]));
        const maxY = Math.max(...shape.map(point => point[1]));

        pieceElement.style.display = "grid";
        pieceElement.style.gridTemplateColumns = `repeat(${maxX + 1}, 70px)`;
        pieceElement.style.gridTemplateRows = `repeat(${maxY + 1}, 70px)`;

        for (const [x, y] of shape) {
            const cell = document.createElement("div");
            cell.classList.add("piece-cell");

            cell.style.gridColumn = x + 1;
            cell.style.gridRow = y + 1;

            pieceElement.appendChild(cell);
        }

        piecesElement.appendChild(pieceElement);

        pieceElement.addEventListener("pointerdown", function(event) {
            const rect = pieceElement.getBoundingClientRect();

            draggedPiece = {
                id: pieceId,
                element: pieceElement,
                originalPosition: logic.piecePositions[pieceId] === null
                    ? null
                    : [...logic.piecePositions[pieceId]],
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };

            pieceElement.setPointerCapture(event.pointerId);

            if (draggedPiece.originalPosition !== null) {
                logic.removePiece(pieceId);
            }
        });
    }
}

function renderPlacedPiece(pieceElement, position) {
    const [x, y] = position;

    boardElement.appendChild(pieceElement);

    pieceElement.style.position = "absolute";
    pieceElement.style.left = `${x * 72}px`;
    pieceElement.style.top = `${y * 72}px`;
}

function renderPieceShape(pieceElement, pieceId) {
    const shape = logic.pieces[pieceId];

    const maxX = Math.max(...shape.map(point => point[0]));
    const maxY = Math.max(...shape.map(point => point[1]));

    pieceElement.style.gridTemplateColumns = `repeat(${maxX + 1}, 70px)`;
    pieceElement.style.gridTemplateRows = `repeat(${maxY + 1}, 70px)`;

    pieceElement.replaceChildren();

    for (const [x, y] of shape) {
        const cell = document.createElement("div");
        cell.classList.add("piece-cell");

        cell.style.gridColumn = x + 1;
        cell.style.gridRow = y + 1;

        pieceElement.appendChild(cell);
    }
}

document.addEventListener("pointermove", function(event) {
    if (draggedPiece === null) return;

    draggedPiece.element.style.position = "fixed";

    draggedPiece.element.style.left =
        `${event.clientX - draggedPiece.offsetX}px`;

    draggedPiece.element.style.top =
        `${event.clientY - draggedPiece.offsetY}px`;
});

document.addEventListener("pointerup", function(event) {
    if (draggedPiece === null) return;

    const boardRect = boardElement.getBoundingClientRect();
    const pieceRect = draggedPiece.element.getBoundingClientRect();
    const cellSize = 70;
    const cellGap = 2;
    const cellStep = cellSize + cellGap;

    const x = Math.round((pieceRect.left - boardRect.left) / cellStep);
    const y = Math.round((pieceRect.top - boardRect.top) / cellStep);

    const targetPosition = [x, y];
    const isOutsideBoard =
    pieceRect.right < boardRect.left ||
    pieceRect.left > boardRect.right ||
    pieceRect.bottom < boardRect.top ||
    pieceRect.top > boardRect.bottom;

    const isValid = logic.canPlacePiece(
        logic.pieces[draggedPiece.id],
        targetPosition
    );
    if (isOutsideBoard && draggedPiece.originalPosition !== null) {
        piecesElement.appendChild(draggedPiece.element);

        draggedPiece.element.style.position = "";
        draggedPiece.element.style.left = "";
        draggedPiece.element.style.top = "";

        draggedPiece = null;
    }
    else if (!isValid && draggedPiece.originalPosition === null) {
        draggedPiece.element.style.position = "";
        draggedPiece.element.style.left = "";
        draggedPiece.element.style.top = "";
        draggedPiece = null;
    }
    else if (!isValid && draggedPiece.originalPosition !== null) {
        logic.placePiece(draggedPiece.originalPosition, draggedPiece.id);

        renderPlacedPiece(
                draggedPiece.element,
                draggedPiece.originalPosition
        );

        draggedPiece = null;
    }
    else if (isValid) {
        logic.placePiece(targetPosition, draggedPiece.id);
        renderPlacedPiece(draggedPiece.element, targetPosition);
        draggedPiece = null;
        if (logic.isBoardFull()) {
            showWinMessage();
        }
    }    
});

document.addEventListener("keydown", function(event) {
    if (draggedPiece === null) return;

    const key = event.key.toLowerCase();
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


const winMessageElement = document.querySelector(".win-message");
function showWinMessage() {
    winMessageElement.classList.remove("show");
    void winMessageElement.offsetWidth;
    winMessageElement.classList.add("show");
}

renderPieces();
renderBoard();
