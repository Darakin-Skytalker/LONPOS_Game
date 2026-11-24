//ENGINE

/* board = [ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] ] */
const BOARD_WIDTH = 11;
const BOARD_HEIGHT = 5;
let board = [];
for (let i = 0; i < BOARD_HEIGHT; i++) {
    board.push([]);
    for (let j = 0; j < BOARD_WIDTH; j++) {
    board[i].push(0);
}}


//the position user inserts to place the piece
let piecePositions = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null,
    8: null,
    9: null,
    10: null,
    11: null,
    12: null
};

//pieces are defined by their local coordinates
let originalPieces  = {
    1: [ [0, 0],
         [0, 1],
         [0, 2],
         [0, 3],
         [1, 3] ],

    2: [ [0, 0],
         [0, 1],
         [0, 2],
         [0, 3] ],

    3: [ [0, 0],
         [0, 1],
         [0, 2],
         [0, 3],
         [1, 2] ],

    4: [ [0, 0],
         [0, 1],
         [0, 2],
         [1, 2],
         [1, 3] ],

    5: [ [0, 0],
         [0, 1],
         [0, 2],
         [1, 2] ],

    6: [ [0, 0],
         [0, 1],
         [0, 2],
         [1, 1],
         [1, 2] ],

    7: [ [0, 0],
         [0, 1],
         [0, 2],
         [1, 2],
         [2, 2] ],

    8: [ [0, 0],
         [0, 1],
         [0, 2],
         [1, 0],
         [1, 2] ],

    9: [ [0, 1],
         [1, 0],
         [1, 1],
         [1, 2],
         [2, 1] ],
        
    10: [ [0, 0],
          [0, 1],
          [1, 1],
          [1, 2],
          [2, 2] ],
        
    11: [ [0, 0],
          [0, 1],
          [1, 0],
          [1, 1] ],
    
    12: [ [0, 0],
          [0, 1],
          [1, 1] ]
};





// Translation upon local coordinates. no Board interaction.
function translatePiece(piece, [x, y]){
    let new_piece = piece.map(move);
    function move(element){
        return [element[0] + x, element[1] + y];
    }
    return new_piece;
}

function isInsideBoard([x, y]) {
    return (0 <= x && x < BOARD_WIDTH && 0 <= y && y < BOARD_HEIGHT)
}

function isCellEmpty([x, y]) {
    return (board[y][x] === 0)
}

function canPlacePiece(piece, position) {
    const placedPiece = translatePiece(piece, position);
    return placedPiece.every(cell => (isInsideBoard(cell) 
                                  && isCellEmpty(cell))  );
}

function placePiece(position, pieceId) {
    if (piecePositions[pieceId] !== null) {
    return false;
    }
    if (canPlacePiece(pieces[pieceId], position)) {
        let piece = translatePiece(pieces[pieceId], position);
        for (let i = 0; i < piece.length; i++) {
            const [x,y] = piece[i];
            board[y][x] = pieceId;
        }
        piecePositions[pieceId] = [...position];
        return true;
    }
    else {
        return false;
    }
}

function removePiece(pieceId) {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if(board[y][x] === pieceId){
                board[y][x] = 0;
            }
        }
    }
    piecePositions[pieceId] = null;
}


function movePiece(newPosition, pieceId) {
    if (piecePositions[pieceId] === null) return false;
    const position = piecePositions[pieceId];
    removePiece(pieceId);
    if(canPlacePiece(pieces[pieceId], newPosition)){
        placePiece(newPosition, pieceId);
        piecePositions[pieceId] = [...newPosition];
        return true;
    }
    else{
        placePiece(position, pieceId);
        return false;
    }
}



function rotatePiece(piece) {
    const rotatedPiece = piece.map(point => [-point[1], point[0]]);
    return normalizePiece(rotatedPiece);
}
function normalizePiece(piece){
    const xs = piece.map(point => point[0]);
    const minX = Math.min(...xs);

    const ys = piece.map(point => point[1]);
    const minY = Math.min(...ys);

    const normalizedPiece = piece.map(point => [
            point[0] - minX,
            point[1] - minY
            ]);

    return normalizedPiece;
}



function reflexHPiece(piece) {
    const reflexedHPiece = piece.map(point => [-point[0], point[1]]);
    return normalizePiece(reflexedHPiece);
}
function reflexVPiece(piece) {
    const reflexedVPiece = piece.map(point => [point[0], -point[1]]);
    return normalizePiece(reflexedVPiece);
}


function getTransformedPiece(piece, transformation) {
    switch (transformation) {
        case "rotate":
            return rotatePiece(piece);
        case "reflectH":
            return reflexHPiece(piece);
        case "reflectV":
            return reflexVPiece(piece);
        default:
            return null;
    }
}


function transformPiece(pieceId, transformation) {
    const newShape = getTransformedPiece(pieces[pieceId], transformation);

    if (newShape === null) {
        return false;
    }

    //Unplaced piece
    if (piecePositions[pieceId] === null) {
        pieces[pieceId] = newShape;
        return true;
    }

    //Placed piece
    const oldShape = structuredClone(pieces[pieceId]);
    const oldPosition = structuredClone(piecePositions[pieceId]);
    removePiece(pieceId);
    if (canPlacePiece(newShape, oldPosition)) {
        pieces[pieceId] = newShape;
        placePiece(oldPosition, pieceId);
        return true;
    } else {
        pieces[pieceId] = oldShape;
        placePiece(oldPosition, pieceId);
        return false;
    }
}


let pieces = structuredClone(originalPieces);
function resetPieces() {
    pieces = structuredClone(originalPieces);
    logic.pieces = pieces;
}

function resetGame(){
    for (let i = 0; i < BOARD_HEIGHT; i++) {
        for (let j = 0; j < BOARD_WIDTH; j++) {
            board[i][j] = 0;
        }
    }
    
    for (let i = 1; i <= 12; i++){
        piecePositions[i] = null;
    }
    resetPieces();
}


function isBoardFull() {
    return board.every(row => row.every(cell => cell !== 0));
}


const logic = {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    board,
    originalPieces,
    pieces,
    piecePositions,

    translatePiece,
    isInsideBoard,
    isCellEmpty,
    canPlacePiece,
    placePiece,
    removePiece,
    movePiece,

    normalizePiece,
    rotatePiece,
    reflexHPiece,
    reflexVPiece,
    getTransformedPiece,
    transformPiece,

    resetPieces,
    resetGame,
    isBoardFull
};

window.logic = logic;