// chess board, moving knight test
// knight starts at 0,0
// return min amount of moves to reach target coordinates in the board
// for example, to get the knight to 4,5 we only need 3 moves
'use strict';

var program = require('commander'),
	fs = require('fs');

program
  .version('1.0.0')
  .usage('-s 0,0 -e 4,5 -m 3')
  .option('-s, --start <x>,<y>', 'Starting position', range)
  .option('-e, --end <x>,<y>', 'Ending position', range)
  .option('-m, --max [int]', 'Max moves')
  .option('-v, --verbosity [int]', 'How much info to display, 0 to 3')
  .parse(process.argv);

var title = fs.readFileSync('./title.txt', 'utf8');
log(title);

var logLineLength = 85;
	log('='.repeat(logLineLength));

// default params
var startPosition,
	endPosition = {x: 4, y: 5},
	maxMoves = program.max || 3,
	verbosity = program.verbosity || 0;

if (program.start) {
	startPosition = {x: program.start[0], y: program.start[1]};
} else {
	log('- using default starting position: 0,0', 1);
}

if (program.end) {
	endPosition = {x: program.end[0], y: program.end[1]};
} else {
	log('- using default ending position: 4,5', 1);
}

if (!program.max) log('- using default max moves: 3', 1);




// start moving the chess piece!
play(startPosition, endPosition, maxMoves);

////////////////////////////////////////////////////////////////////////

function play(startPosition, endPosition, maxMoves) {
	console.time('elapsed time');

	// set available pieceTypes
	var pieceTypes = {
		knight: Knight
	};

	// create a player and a knight
	var settings = {maxMoves: maxMoves},
		player1 = new Player(settings),
		knight = new Knight(startPosition);

	// give the knight to the player and start having fun!
	var moves = player1.getBestMoves(knight, endPosition);

	// check if the solution wasn't found
	if (!moves) {
		log('-- Sorry, I was unable to find a solution in ' + player1.getMaxMoves() + ' moves.');
		log();
		return;
	}

	// OK, solution found!
	var total = moves.length;
	log();
	log('/'.repeat(logLineLength));
	log('---> ' + total + ' MOVES:', moves);
	log('/'.repeat(logLineLength));
	log();
	log();

	console.timeEnd('elapsed time');

	// return the amount of moves in the best possible play
	return moves.length;

	//------------------------------------------------------------

	/**
	 * Player can use chess pieces and find the best way to move them from
	 * one point in the board to another.
	 * 
	 * @param settings {object} {maxMoves: [int]}
	 */
	function Player(settings) {
		settings = settings || {};
		var effectiveMoves = [], // possible ways to get to target position
			maxMoves = settings.maxMoves || 3;

		// interface
		return {
			getBestMoves: getBestMoves,
			getMaxMoves: getMaxMoves
		};

		//------------------------------------------------------------

		function getMaxMoves() {
			return maxMoves;
		}

		/**
		 * Returns an array containing the best moves to reach end position as fast as possible,
		 * with the least amount of movements.
		 * 
		 * @param piece {object}
		 * @param endPosition {object}
		 * @return {array} best moves
		 */
		function getBestMoves(piece, endPosition) {
			log('| trying to move a ' + piece.getType());
			log('| from ', piece.getPosition());
			log('| to ', endPosition);
			log('| in ' + maxMoves + ' moves');
			log('-'.repeat(logLineLength));

			// first check if piece is already at target position
			if (piece.isAt(endPosition)) {
				log('== ALREADY at target position! Best move is not to move! ;)');
				return;
			}

			var effectiveMoves = getMoves(piece, endPosition);

			// we got a collection of effective moves, moves that takes us to target position
			// now lets find out the best move!
			var bestMoves;
			effectiveMoves.forEach(function(moves) {
				if (!bestMoves || moves.length < bestMoves.length) {
					log('-- best moves so far: ' + moves.length, moves, 3);
					bestMoves = moves;
				}
			});

			return bestMoves;
		}

		/**
		 * Recursively find movements to reach end position.
		 * 
		 * @param  {object}
		 * @param  {object}
		 * @param  {array}
		 * @param  {int}
		 * @return {boolean}
		 */
		function getMoves(piece, endPosition, previousMoves, level) {
			level = ++level || 0;

			if (!piece || typeof piece !== 'object') {
				throw new Error('ERROR: invalid piece!');
			}

			if (!endPosition || !endPosition.x || !endPosition.y) {
				throw new Error('ERROR: invalid target positions! Provide {x: [int], y: [int]}');
			}

			// limit max moves
			previousMoves = previousMoves || [];
			if (previousMoves.length >= maxMoves) {
				log('- MAX MOVES reached! Sorry. //level ' + level, 3);
				log('-------------------------------------', 3);
				return false;
			}

			// detect if we're moving away from target
			// this will significantly reduce processing time
			if (isMovingAway(previousMoves, endPosition, 1)) return false;

			// iterate over valid moves
			var validMoves = piece.getValidMoves();
			validMoves.forEach(function(movement) {
				var movedPiece = move(piece, movement),
					moves = previousMoves.concat([]); // keep track of the moves we're doing
				moves.push({position: movedPiece.getPosition(), movement: movement}); // track movement

				// check if we reached target position
				if (movedPiece.isAt(endPosition)) {
					log('--- YAY! I found a path! (level ' + level + ')', moves, 1);
					effectiveMoves.push(moves);
					return true;
				}

				// we didn't get to target position yet
				// let's move again from here
				getMoves(movedPiece, endPosition, moves, level);
			});

			return effectiveMoves;


			//------------------------------------------------------------

			/**
			 * Creates a copy of passed piece, applies requested movement to it
			 * and returns it.
			 * 
			 * @param piece {object}
			 * @param movement {object}
			 * @return {object} moved piece
			 */
			function move(piece, movement) {
				log('+ move: ', movement.replace('move', ''), 3);
				if (typeof piece[movement] !== 'function') {
					throw new Error('ERROR: invalid move!');
				}

				var movingPiece = new pieceTypes[piece.getType()](piece.getPosition());
				movingPiece[movement]();
				log('/ moved piece to: ', movingPiece.getPosition(), 3);
				return movingPiece;
			}

			/**
			 * Returns true if we're moving away from end position.
			 * This tremendously increases performance at the cost of not finding
			 * less efficient paths.
			 * 
			 * @param moves {array}
			 * @param endPosition {object}
			 * @param samplesCount {int}
			 * @return {Boolean}
			 */
			function isMovingAway(moves, endPosition, samplesCount) {
				samplesCount = samplesCount || 3;
				if (!moves || moves.length < samplesCount) return false;
				var latestMoves = moves.slice(-samplesCount-1),
					movesAway = 0, // counts how many times it moves away
					firstMovement = latestMoves.shift(),
					deltaX = Math.abs(endPosition.x) - Math.abs(firstMovement.position.x),
					deltaY = Math.abs(endPosition.y) - Math.abs(firstMovement.position.y);

				latestMoves.forEach(function(movement) {
					var newDeltaX = Math.abs(endPosition.x) - Math.abs(movement.position.x),
						newDeltaY = Math.abs(endPosition.y) - Math.abs(movement.position.y);
					if (newDeltaX > deltaX || newDeltaY > deltaY) ++movesAway;
				});
				
				if (movesAway > samplesCount-1) return true;
				return false;
			}
		}
	}

	/**
	 * Knight chess piece.
	 * 
	 * @param {object}
	 */
    function Knight(startPosition) {
    	startPosition = startPosition || {};

    	var type = 'knight',
    		x = startPosition.x || 0,
    		y = startPosition.y || 0,
    		validMoves = [
				'moveUpRight',
				'moveRightUp',
				'moveRightDown',
				'moveDownRight',
				'moveDownLeft',
				'moveLeftDown',
				'moveLeftUp',
				'moveUpLeft'
			];

		// interface
		return {
			getType: getType,
			getPosition: getPosition,
			getValidMoves: getValidMoves,
			isAt: isAt,

			// movements
			moveUpRight: moveUpRight,
			moveRightUp: moveRightUp,
			moveRightDown: moveRightDown,
			moveDownRight: moveDownRight,
			moveDownLeft: moveDownLeft,
			moveLeftDown: moveLeftDown,
			moveLeftUp: moveLeftUp,
			moveUpLeft: moveUpLeft
		};

		//------------------------------------------------------------

		function getType() {
			return type;
		}

		function getPosition() {
			var position = {
				x: x,
				y: y
			};

			return position;
		}

		function getValidMoves() {
			return validMoves;
		}

		function isAt(position) {
			if (x === position.x && y === position.y) return true;
			return false;
		}

    	function moveUpRight() {
    		x+=1;
    		y+=2;
    	}

    	function moveRightUp() {
    		x+=2;
    		y+=1;
    	}

    	function moveRightDown() {
    		x+=2;
    		y-=1;
    	}

    	function moveDownRight() {
    		x+=1;
    		y-=2;
    	}

    	function moveDownLeft() {
    		x-=1;
    		y-=2;
    	}

    	function moveLeftDown() {
    		x-=2;
    		y-=1;
    	}

    	function moveLeftUp() {
    		x-=2;
    		y+=1;
    	}

    	function moveUpLeft() {
    		x-=1;
    		y+=2;
    	}
    }
}

// params helper
function range(val) {
  return val.split(',').map(Number);
}

// log helper
function log(message, obj, logLevel) {
	if (message === undefined) message = '';
	if (typeof message === 'object') {
		if (typeof obj === 'number' && verbosity < obj) return; // not verbose enough 

		console.log(message);
		return;
	} 

	if (typeof obj === 'object') {
		if (typeof logLevel === 'number' && verbosity < logLevel) return; // not verbose enough 
		console.log(message, obj);
		return;
	}

	if (typeof logLevel === 'number') {
		if (typeof logLevel === 'number' && verbosity < logLevel) return; // not verbose enough 
		console.log(message, obj);
		return;
	}

	if (typeof obj === 'number' && verbosity < obj) return; // not verbose enough
	console.log(message);
}
