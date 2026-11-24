/*
 * logic.js: game engine for a 12-piece puzzle on an 11 x 5 board.
 *
 * The goal is to fit all 12 pieces on the board with no gaps (the pieces
 * add up to exactly 55 cells = 11 x 5). This file holds the game state and
 * rules only; it never touches the page. ui.js imports it and draws things.
 *
 * Coordinates are always [x, y]:
 *     x = column (0 is the left edge), y = row (0 is the top edge).
 * Note that the board array is indexed the other way round: board[y][x].
 *
 * Pieces have ids 1 to 12. A piece is a list of [x, y] cells relative to
 * its own top-left corner. A piece's "position" is where that corner sits
 * on the board.
 */

//ENGINE

/* board = [ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] ] */
const BOARD_WIDTH = 11;
const BOARD_HEIGHT = 5;

// The board grid. An empty cell is 0; a cell covered by a piece holds that
// piece's id (1 to 12).
let board = [];
for (let i = 0; i < BOARD_HEIGHT; i++) {
    board.push([]);
    for (let j = 0; j < BOARD_WIDTH; j++) {
    board[i].push(0);
}}


//the position user inserts to place the piece
// Maps each piece id to the [x, y] position where it is currently placed on
// the board, or null while the piece is not on the board.
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
// The starting shape of every piece. This object is never modified; the
// working copy (`pieces`, below) is what rotations and flips change, and
// resetPieces() copies this one back into it.
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





/* ---------- Placing, removing and moving pieces ---------- */

// Translation upon local coordinates. no Board interaction.
/**
 * Shift every cell of a piece by [x, y].
 * Returns a new list of cells; the original piece is not changed and the
 * board is not touched.
 */
function translatePiece(piece, [x, y]){
    let new_piece = piece.map(move);
    function move(element){
        return [element[0] + x, element[1] + y];
    }
    return new_piece;
}

/** True if the board cell [x, y] lies within the board's edges. */
function isInsideBoard([x, y]) {
    return (0 <= x && x < BOARD_WIDTH && 0 <= y && y < BOARD_HEIGHT)
}

/**
 * True if the board cell [x, y] is not covered by any piece.
 * The cell must be inside the board (check isInsideBoard first, otherwise
 * board[y] may not exist).
 */
function isCellEmpty([x, y]) {
    return (board[y][x] === 0)
}

/**
 * Check whether a piece shape fits on the board at a position.
 * Every cell must be inside the board and on an empty square. The board is
 * not changed.
 */
function canPlacePiece(piece, position) {
    const placedPiece = translatePiece(piece, position);
    // && stops at the first false, so isCellEmpty only runs for cells
    // that are inside the board
    return placedPiece.every(cell => (isInsideBoard(cell)
                                  && isCellEmpty(cell))  );
}

/**
 * Put a piece on the board with its top-left corner at `position`.
 * Returns true on success. Returns false (and changes nothing) if the piece
 * is already on the board or does not fit.
 */
function placePiece(position, pieceId) {
    if (piecePositions[pieceId] !== null) {
    return false;
    }
    if (canPlacePiece(pieces[pieceId], position)) {
        let piece = translatePiece(pieces[pieceId], position);
        // Mark each covered cell with the piece's id
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

/**
 * Take a piece off the board: clear all of its cells and forget its
 * position. Does nothing harmful if the piece is not on the board.
 */
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


/**
 * Move a piece that is already on the board to a new position.
 * Returns true if it moved. If the new spot is not free the piece goes
 * back to where it was and false is returned. Returns false straight away
 * if the piece is not on the board.
 */
function movePiece(newPosition, pieceId) {
    if (piecePositions[pieceId] === null) return false;
    const position = piecePositions[pieceId];
    // Lift the piece first so it doesn't block its own new position
    removePiece(pieceId);
    if(canPlacePiece(pieces[pieceId], newPosition)){
        placePiece(newPosition, pieceId);
        piecePositions[pieceId] = [...newPosition];
        return true;
    }
    else{
        // Put it back where it was
        placePiece(position, pieceId);
        return false;
    }
}



/* ---------- Rotating and flipping piece shapes ---------- */

/**
 * Rotate a shape a quarter turn. (x, y) becomes (-y, x), and the result is
 * shifted back so its top-left cell is at 0, 0 again.
 */
function rotatePiece(piece) {
    const rotatedPiece = piece.map(point => [-point[1], point[0]]);
    return normalizePiece(rotatedPiece);
}

/**
 * Shift a shape so that its smallest x and smallest y are both 0.
 * Rotating or flipping can push cells into negative coordinates; this puts
 * the shape back in the standard form that the rest of the code expects.
 */
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



/** Mirror a shape left-to-right (flip across the vertical axis). */
function reflexHPiece(piece) {
    const reflexedHPiece = piece.map(point => [-point[0], point[1]]);
    return normalizePiece(reflexedHPiece);
}
/** Mirror a shape top-to-bottom (flip across the horizontal axis). */
function reflexVPiece(piece) {
    const reflexedVPiece = piece.map(point => [point[0], -point[1]]);
    return normalizePiece(reflexedVPiece);
}


/**
 * Return the transformed copy of a shape for a transformation name:
 * "rotate", "reflectH" or "reflectV". Returns null for any other name.
 */
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


/**
 * Rotate or flip a piece by id, whether or not it is on the board.
 *
 * A piece that is not on the board is simply changed. A piece that is on
 * the board is lifted off, and only changed if the new shape still fits at
 * the same position; otherwise it keeps its old shape and goes back.
 *
 * Returns true if the shape changed, false if the transformation name is
 * unknown or the new shape does not fit.
 */
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
    // Save the old state so it can be restored if the new shape doesn't fit
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


/* ---------- Resetting ---------- */

// The current (possibly rotated or flipped) shapes. This is a deep copy so
// changing it never alters originalPieces.
let pieces = structuredClone(originalPieces);

/**
 * Restore every piece to its starting shape. `logic.pieces` has to be
 * pointed at the new object because `pieces` is replaced, not edited.
 */
function resetPieces() {
    pieces = structuredClone(originalPieces);
    logic.pieces = pieces;
}

/**
 * Start over: empty the board, mark every piece as not placed and restore
 * the original shapes. The board array is cleared in place (not replaced)
 * so that `logic.board` keeps pointing at it.
 */
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


/** True when no cell is empty, i.e. the puzzle is solved. */
function isBoardFull() {
    return board.every(row => row.every(cell => cell !== 0));
}


// Everything other files may use, bundled in one object (ui.js imports it
// as `logic`).
// Caution: `pieces` is replaced by resetPieces(), which is why that function
// also updates logic.pieces. Always read the shapes through
// `logic.pieces` rather than saving a copy of the reference.
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

export default logic;
