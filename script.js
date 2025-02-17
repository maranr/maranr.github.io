class Ball {
    constructor(x, y, radius, number, isStriped = false) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dx = 0;
        this.dy = 0;
        this.number = number; // 0 for cue ball, 1-15 for others
        this.isStriped = isStriped;
        this.mass = radius * radius;
        this.isCueBall = number === 0;
        this.isDragging = false;
        this.startDragX = 0;
        this.startDragY = 0;
        this.pocketed = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.isAiming = false;  // New property to track aiming state
        this.spin = 0; // -1 to 1, where -1 is backspin, 0 is no spin, 1 is topspin
        this.sideSpin = 0; // -1 to 1, where -1 is left spin, 0 is no spin, 1 is right spin
    }

    draw(ctx) {
        if (this.pocketed) return;

        // Ball shadow
        ctx.beginPath();
        ctx.arc(this.x + 2, this.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        ctx.closePath();

        // Ball base color
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        if (this.number === 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.getBaseColor();
        }
        ctx.fill();
        ctx.closePath();

        // Stripes
        if (this.isStriped && this.number !== 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0.25 * Math.PI, 0.75 * Math.PI);
            ctx.arc(this.x, this.y, this.radius, 1.25 * Math.PI, 1.75 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.closePath();
        }

        // Number circle
        if (this.number !== 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.closePath();

            // Number
            ctx.fillStyle = '#000000';
            ctx.font = `${this.radius}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.number.toString(), this.x, this.y);
        }

        // Draw aim line when aiming (before shooting)
        if (this.isAiming && this.isCueBall) {
            // Calculate direction from cue ball to mouse
            const dx = this.mouseX - this.x;
            const dy = this.mouseY - this.y;
            const angle = Math.atan2(dy, dx);
            
            // Draw aim line through the ball
            ctx.beginPath();
            ctx.moveTo(
                this.x - Math.cos(angle) * 1000,
                this.y - Math.sin(angle) * 1000
            );
            ctx.lineTo(
                this.x + Math.cos(angle) * 1000,
                this.y + Math.sin(angle) * 1000
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Only show power indicator when actually dragging
            if (this.isDragging) {
                const dragDistance = Math.hypot(this.startDragX - this.x, this.startDragY - this.y);
                const maxPower = 400;
                const power = Math.min(dragDistance, maxPower);
                const powerPercentage = dragDistance / maxPower;
                
                // Draw power indicator behind the cue ball
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x - Math.cos(angle) * dragDistance,
                    this.y - Math.sin(angle) * dragDistance
                );

                // Create gradient
                const gradient = ctx.createLinearGradient(
                    this.x, this.y,
                    this.x - Math.cos(angle) * dragDistance,
                    this.y - Math.sin(angle) * dragDistance
                );
                
                // Light to dark red gradient
                gradient.addColorStop(0, "rgba(255, 150, 150, 0.8)"); // Light red
                gradient.addColorStop(1, `rgba(${Math.floor(155 + powerPercentage * 100)}, 0, 0, 0.8)`); // Darker red based on power

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // Draw spin indicator for cue ball when aiming
        if (this.isCueBall && (this.isAiming || this.isDragging)) {  // Show when aiming or dragging
            // Draw spin indicator circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';  // Make more visible
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw spin position marker and arrow
            if (this.spin !== 0 || this.sideSpin !== 0) {
                // Calculate aim direction
                const dx = this.mouseX - this.x;
                const dy = this.mouseY - this.y;
                const aimAngle = Math.atan2(dy, dx);

                // Calculate spin marker position relative to aim direction
                const rotatedX = this.sideSpin * Math.cos(aimAngle + Math.PI/2) + 
                               this.spin * Math.cos(aimAngle);
                const rotatedY = this.sideSpin * Math.sin(aimAngle + Math.PI/2) + 
                               this.spin * Math.sin(aimAngle);

                // Scale the offset and add to ball position
                const markerX = this.x + (rotatedX * this.radius * 0.6);  // Increased from 0.5
                const markerY = this.y + (rotatedY * this.radius * 0.6);  // Increased from 0.5

                // Draw the arrow first (behind the marker)
                const arrowLength = this.radius * 0.4;  // Increased from 0.3
                const arrowWidth = this.radius * 0.2;   // Increased from 0.15
                
                // Draw arrow line
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(markerX, markerY);
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';  // More visible gold
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw arrow head
                ctx.beginPath();
                ctx.moveTo(markerX, markerY);
                const headAngle = Math.atan2(markerY - this.y, markerX - this.x);
                ctx.lineTo(
                    markerX - Math.cos(headAngle - Math.PI/6) * arrowWidth,
                    markerY - Math.sin(headAngle - Math.PI/6) * arrowWidth
                );
                ctx.lineTo(
                    markerX - Math.cos(headAngle + Math.PI/6) * arrowWidth,
                    markerY - Math.sin(headAngle + Math.PI/6) * arrowWidth
                );
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
                ctx.fill();

                // Draw the spin marker on top
                ctx.beginPath();
                ctx.arc(markerX, markerY, this.radius * 0.25, 0, Math.PI * 2);  // Increased from 0.2
                ctx.fillStyle = '#ffd700';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Draw power indicator and escape hint when dragging
        if (this.isDragging) {
            const dragDistance = Math.hypot(this.startDragX - this.x, this.startDragY - this.y);
            const maxPower = 400;
            const power = Math.min(dragDistance, maxPower);
            const powerPercentage = dragDistance / maxPower;
            
            // ... existing power indicator code ...

            // Add escape hint
            ctx.font = '14px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.textAlign = 'center';
            ctx.fillText('Press Esc to cancel shot', this.x, this.y - this.radius * 2.5);
        }
    }

    getBaseColor() {
        const colors = {
            1: '#FFD700', // Yellow
            2: '#0000FF', // Blue
            3: '#FF0000', // Red
            4: '#800080', // Purple
            5: '#FFA500', // Orange
            6: '#008000', // Green
            7: '#8B4513', // Brown
            8: '#000000', // Black
            9: '#FFD700', // Yellow
            10: '#0000FF', // Blue
            11: '#FF0000', // Red
            12: '#800080', // Purple
            13: '#FFA500', // Orange
            14: '#008000', // Green
            15: '#8B4513', // Brown
        };
        return colors[this.number];
    }

    update(canvas, balls) {
        if (this.pocketed) return;
        if (this.isDragging) return;

        // Get table config once
        const { feltX, feltY, feltWidth, feltHeight, cushionWidth } = tableConfig;
        
        // Update position based on velocity
        this.x += this.dx;
        this.y += this.dy;

        // Apply friction
        this.dx *= 0.99;
        this.dy *= 0.99;

        // Stop very slow movements
        if (Math.abs(this.dx) < 0.01) this.dx = 0;
        if (Math.abs(this.dy) < 0.01) this.dy = 0;

        // Define pockets array
        const pockets = [
            { x: feltX, y: feltY },
            { x: feltX + feltWidth/2, y: feltY },
            { x: feltX + feltWidth, y: feltY },
            { x: feltX, y: feltY + feltHeight },
            { x: feltX + feltWidth/2, y: feltY + feltHeight },
            { x: feltX + feltWidth, y: feltY + feltHeight }
        ];

        // Boundary checks with bouncing
        const maxX = feltX + feltWidth - cushionWidth - this.radius;
        const minX = feltX + cushionWidth + this.radius;
        const maxY = feltY + feltHeight - cushionWidth - this.radius;
        const minY = feltY + cushionWidth + this.radius;

        // Check right cushion
        if (this.x > maxX) {
            if (shouldBounce(this.x, this.y, pockets, tableConfig)) {
                this.x = maxX;
                this.dx = -this.dx * 0.85; // Add energy loss on bounce
            }
        }
        // Check left cushion
        if (this.x < minX) {
            if (shouldBounce(this.x, this.y, pockets, tableConfig)) {
                this.x = minX;
                this.dx = -this.dx * 0.85;
            }
        }
        // Check bottom cushion
        if (this.y > maxY) {
            if (shouldBounce(this.x, this.y, pockets, tableConfig)) {
                this.y = maxY;
                this.dy = -this.dy * 0.85;
            }
        }
        // Check top cushion
        if (this.y < minY) {
            if (shouldBounce(this.x, this.y, pockets, tableConfig)) {
                this.y = minY;
                this.dy = -this.dy * 0.85;
            }
        }

        // Check for pocketing
        for (const pocket of pockets) {
            const pocketEffect = isNearPocket(this.x, this.y, pocket, this.radius);
            
            if (pocketEffect.isPocketed) {
                if (pocketEffect.pullX || pocketEffect.pullY) {
                    // Apply pull effect before pocketing
                    this.dx += pocketEffect.pullX;
                    this.dy += pocketEffect.pullY;
                } else {
                    this.pocketed = true;
                    console.log('Ball being pocketed:', this.number);
                    
                    if (this.number !== 0) { // Not cue ball
                        // Add to pocketed balls array
                        pocketedBalls.push(this);
                        // Add score
                        score += getBallValue(this.number);
                    }
                    
                    // Track last sunk ball (except cue ball and 8 ball)
                    if (this.number !== 0 && this.number !== 8) {
                        lastSunkBall = this;
                        if (playerIsStripes === null) {
                            playerIsStripes = this.isStriped;
                        }
                    }
                    
                    // Check if it's the 8 ball
                    if (this.number === 8) {
                        // Count remaining unpocketed balls (excluding cue ball)
                        const remainingBalls = balls.filter(b => !b.pocketed && b.number !== 0 && b.number !== 8).length;
                        if (remainingBalls > 0) {
                            // Lost the game
                            gameOver = true;
                            gameOverMessage = 'You sunk the 8 Ball. You lose!';
                            gameOverOpacity = 1.0;
                            setTimeout(restartGame, 2000); // Restart after 2 seconds
                        }
                    }
                    
                    pocketSound.currentTime = 0;
                    pocketSound.play().catch(e => console.error('Error playing pocket sound:', e));
                    return;
                }
            }
        }

        // Check collision with other balls
        for (let ball of balls) {
            if (ball === this) continue;

            const dx = ball.x - this.x;
            const dy = ball.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + ball.radius) {
                // Normal vector of collision
                const nx = dx / distance;
                const ny = dy / distance;

                // Tangent vector of collision
                const tx = -ny;
                const ty = nx;

                // Dot product of velocity and normal/tangent vectors for both balls
                const dpNorm1 = this.dx * nx + this.dy * ny;
                const dpNorm2 = ball.dx * nx + ball.dy * ny;
                const dpTan1 = this.dx * tx + this.dy * ty;
                const dpTan2 = ball.dx * tx + ball.dy * ty;

                // Conservation of momentum in 1D elastic collision
                const m1 = this.mass;
                const m2 = ball.mass;
                const v1 = dpNorm1;
                const v2 = dpNorm2;

                // New normal velocities using elastic collision formula
                const newV1 = (v1 * (m1 - m2) + 2 * m2 * v2) / (m1 + m2);
                const newV2 = (v2 * (m2 - m1) + 2 * m1 * v1) / (m1 + m2);

                // Apply energy loss in collision
                const restitution = 0.95;
                
                // Convert scalar normal and tangential velocities back to vectors
                this.dx = (tx * dpTan1 + nx * newV1) * restitution;
                this.dy = (ty * dpTan1 + ny * newV1) * restitution;
                ball.dx = (tx * dpTan2 + nx * newV2) * restitution;
                ball.dy = (ty * dpTan2 + ny * newV2) * restitution;

                // Prevent sticking by moving balls apart
                const overlap = (this.radius + ball.radius - distance) / 2;
                this.x -= overlap * nx;
                this.y -= overlap * ny;
                ball.x += overlap * nx;
                ball.y += overlap * ny;

                // Calculate collision speed for sound
                const relativeSpeed = Math.hypot(this.dx - ball.dx, this.dy - ball.dy);
                if (relativeSpeed > 2) {
                    console.log('Playing collision sound, speed:', relativeSpeed);
                    ballHitSound.currentTime = 0;
                    ballHitSound.play().catch(e => console.error('Error playing collision sound:', e));
                }
            }
        }

        // Apply spin effects
        this.applySpinEffect();

        // Modify bounce physics to account for spin
        if (this.x > maxX || this.x < minX) {
            if (shouldBounce(this.x, this.y, pockets, tableConfig)) {
                // Reverse side spin on horizontal bounces
                this.sideSpin = -this.sideSpin * 0.8;
            }
        }
        if (this.y > maxY || this.y < minY) {
            if (shouldBounce(this.x, this.y, pockets, tableConfig)) {
                // Reverse side spin on vertical bounces
                this.sideSpin = -this.sideSpin * 0.8;
            }
        }
    }

    applySpinEffect() {
        if (Math.abs(this.spin) > 0.01) {
            // Apply forward/backward spin effect
            const speed = Math.hypot(this.dx, this.dy);
            if (speed > 0.1) {
                const spinEffect = this.spin * speed * 0.015;
                this.dx += (this.dx / speed) * spinEffect;
                this.dy += (this.dy / speed) * spinEffect;
            }
            // Gradually reduce spin
            this.spin *= 0.98;
        }

        if (Math.abs(this.sideSpin) > 0.01) {
            // Apply side spin effect
            const speed = Math.hypot(this.dx, this.dy);
            if (speed > 0.1) {
                // Calculate perpendicular direction for side spin
                const perpX = -this.dy / speed;
                const perpY = this.dx / speed;
                const sideEffect = this.sideSpin * speed * 0.01;
                this.dx += perpX * sideEffect;
                this.dy += perpY * sideEffect;
            }
            // Gradually reduce side spin
            this.sideSpin *= 0.98;
        }
    }
}

function drawTable(ctx, canvas) {
    // Wooden frame
    ctx.fillStyle = '#5c3a21';  // Dark brown for the wooden frame
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Table felt
    ctx.fillStyle = '#355c3a';  // Darker green for more realistic felt
    ctx.fillRect(
        tableConfig.feltX, 
        tableConfig.feltY, 
        tableConfig.feltWidth, 
        tableConfig.feltHeight
    );

    // Draw cushions with a more realistic appearance
    const { feltX, feltY, feltWidth, feltHeight, cushionWidth, pocketRadius } = tableConfig;
    
    // Cushion color and highlight
    const cushionBase = '#2d503f';
    const cushionHighlight = '#3a6351';
    
    // Draw cushions with subtle gradient for 3D effect
    function drawCushionWithGradient(x, y, width, height) {
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, cushionHighlight);
        gradient.addColorStop(0.5, cushionBase);
        gradient.addColorStop(1, cushionBase);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
    }

    // Top cushion
    drawCushionWithGradient(
        feltX + cushionWidth, 
        feltY, 
        feltWidth - 2 * cushionWidth, 
        cushionWidth
    );

    // Bottom cushion
    drawCushionWithGradient(
        feltX + cushionWidth, 
        feltY + feltHeight - cushionWidth, 
        feltWidth - 2 * cushionWidth, 
        cushionWidth
    );

    // Left cushion
    drawCushionWithGradient(
        feltX, 
        feltY + cushionWidth, 
        cushionWidth, 
        feltHeight - 2 * cushionWidth
    );

    // Right cushion
    drawCushionWithGradient(
        feltX + feltWidth - cushionWidth, 
        feltY + cushionWidth, 
        cushionWidth, 
        feltHeight - 2 * cushionWidth
    );

    // Draw pockets
    const pockets = [
        { x: tableConfig.feltX, y: tableConfig.feltY },
        { x: tableConfig.feltX + tableConfig.feltWidth/2, y: tableConfig.feltY },
        { x: tableConfig.feltX + tableConfig.feltWidth, y: tableConfig.feltY },
        { x: tableConfig.feltX, y: tableConfig.feltY + tableConfig.feltHeight },
        { x: tableConfig.feltX + tableConfig.feltWidth/2, y: tableConfig.feltY + tableConfig.feltHeight },
        { x: tableConfig.feltX + tableConfig.feltWidth, y: tableConfig.feltY + tableConfig.feltHeight }
    ];

    // Draw pocket liners (slightly larger than the holes for better visibility)
    pockets.forEach(pocket => {
        // Pocket liner (darker ring around pocket)
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, tableConfig.pocketRadius + 5, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.closePath();

        // Pocket hole
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, tableConfig.pocketRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.closePath();
    });
}

function drawCushions(ctx) {
    const { feltX, feltY, feltWidth, feltHeight, cushionWidth, pocketRadius } = tableConfig;
    
    // Adjust pocket openings and curve parameters
    const pocketGap = pocketRadius * 1.8;
    const curveRadius = pocketRadius * 1.2; // Radius of the curved guides
    
    ctx.fillStyle = '#2a5240';
    
    // Helper function to draw curved cushion edges
    function drawCurvedCushion(x, y, startAngle, endAngle, isCorner) {
        ctx.beginPath();
        if (isCorner) {
            // Corner pockets get slightly larger curves
            ctx.arc(x, y, curveRadius * 1.2, startAngle, endAngle);
        } else {
            ctx.arc(x, y, curveRadius, startAngle, endAngle);
        }
        ctx.lineTo(x + Math.cos(endAngle) * cushionWidth, y + Math.sin(endAngle) * cushionWidth);
        ctx.arc(x, y, curveRadius + cushionWidth, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fill();
    }

    // Top cushions with curved edges
    // Left top corner
    drawCurvedCushion(feltX + pocketGap, feltY + pocketGap/2, -Math.PI/4, 0, true);
    // Middle top left
    drawCurvedCushion(feltX + feltWidth/2 - pocketGap, feltY + pocketGap/2, -Math.PI/6, 0, false);
    // Middle top right
    drawCurvedCushion(feltX + feltWidth/2 + pocketGap, feltY + pocketGap/2, Math.PI, -5*Math.PI/6, false);
    // Right top corner
    drawCurvedCushion(feltX + feltWidth - pocketGap, feltY + pocketGap/2, Math.PI, 5*Math.PI/4, true);

    // Bottom cushions with curved edges
    // Left bottom corner
    drawCurvedCushion(feltX + pocketGap, feltY + feltHeight - pocketGap/2, 0, Math.PI/4, true);
    // Middle bottom left
    drawCurvedCushion(feltX + feltWidth/2 - pocketGap, feltY + feltHeight - pocketGap/2, 0, Math.PI/6, false);
    // Middle bottom right
    drawCurvedCushion(feltX + feltWidth/2 + pocketGap, feltY + feltHeight - pocketGap/2, -5*Math.PI/6, 0, false);
    // Right bottom corner
    drawCurvedCushion(feltX + feltWidth - pocketGap, feltY + feltHeight - pocketGap/2, -5*Math.PI/4, 0, true);

    // Straight sections of cushions
    ctx.fillRect(feltX + pocketGap * 1.5, feltY, feltWidth/2 - pocketGap * 2.5, cushionWidth); // Top left
    ctx.fillRect(feltX + feltWidth/2 + pocketGap, feltY, feltWidth/2 - pocketGap * 2.5, cushionWidth); // Top right
    ctx.fillRect(feltX + pocketGap * 1.5, feltY + feltHeight - cushionWidth, feltWidth/2 - pocketGap * 2.5, cushionWidth); // Bottom left
    ctx.fillRect(feltX + feltWidth/2 + pocketGap, feltY + feltHeight - cushionWidth, feltWidth/2 - pocketGap * 2.5, cushionWidth); // Bottom right
    ctx.fillRect(feltX, feltY + pocketGap * 1.5, cushionWidth, feltHeight/2 - pocketGap * 2.5); // Left top
    ctx.fillRect(feltX, feltY + feltHeight/2 + pocketGap, cushionWidth, feltHeight/2 - pocketGap * 2.5); // Left bottom
    ctx.fillRect(feltX + feltWidth - cushionWidth, feltY + pocketGap * 1.5, cushionWidth, feltHeight/2 - pocketGap * 2.5); // Right top
    ctx.fillRect(feltX + feltWidth - cushionWidth, feltY + feltHeight/2 + pocketGap, cushionWidth, feltHeight/2 - pocketGap * 2.5); // Right bottom
}

function createCarpetPattern() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 50;
    patternCanvas.height = 50;
    const patternCtx = patternCanvas.getContext('2d');
    
    patternCtx.fillStyle = '#614126';
    patternCtx.fillRect(0, 0, 50, 50);
    
    patternCtx.strokeStyle = '#523420';
    patternCtx.lineWidth = 1;
    
    for (let i = 0; i < 50; i += 10) {
        patternCtx.beginPath();
        patternCtx.moveTo(i, 0);
        patternCtx.lineTo(i, 50);
        patternCtx.stroke();
        
        patternCtx.beginPath();
        patternCtx.moveTo(0, i);
        patternCtx.lineTo(50, i);
        patternCtx.stroke();
    }
    
    return patternCanvas;
}

function createRackPositions(startX, startY, radius) {
    const positions = [];
    // Reduce spacing so balls are touching
    const spacing = radius * 2.01; // Just slightly over 2 to prevent physics glitches
    
    // Define the number of balls in each row (from front to back)
    const rows = [1, 2, 3, 4, 5];
    
    let currentX = startX;
    let currentY = startY;
    
    // Calculate 60-degree triangle spacing (equilateral triangle)
    const rowSpacing = spacing * Math.sin(Math.PI / 3); // ~0.866 * spacing
    
    rows.forEach((ballsInRow, rowIndex) => {
        // Calculate the width of this row
        const rowWidth = (ballsInRow - 1) * spacing;
        // Center the row vertically
        const rowStartY = currentY - rowWidth / 2;
        
        for (let i = 0; i < ballsInRow; i++) {
            positions.push({
                x: currentX,
                y: rowStartY + (i * spacing)
            });
        }
        // Move back for next row (rack points right)
        currentX += rowSpacing;
    });
    
    return positions;
}

// Move these to the top of the file with other global variables
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set fixed canvas size
canvas.width = 1400;
canvas.height = 900;

// Add this with other global variables
let balls = []; // Make balls global

// Define table configuration
const tableConfig = {
    feltX: 150,
    feltY: 150,
    feltWidth: canvas.width - 300,
    feltHeight: canvas.height - 300,
    cushionWidth: 20,
    pocketRadius: 35,
    cornerPocketRadius: 28,
    middlePocketRadius: 26,
    cornerPocketAngle: Math.PI / 3,
    pocketSensitivity: 1.0,
};

// Add these at the top with other global variables
let cueSensitivity = 1.0; // Default sensitivity
const ballHitSound = new Audio('sounds/hit.mp3');
ballHitSound.volume = 0.3;
console.log('Ball hit sound created:', ballHitSound);

const pocketSound = new Audio('sounds/pocket.mp3');
pocketSound.volume = 0.3;
console.log('Pocket sound created:', pocketSound);

// Add these variables at the top with other globals
let gameOver = false;
let gameOverOpacity = 0;
let gameOverMessage = '';

// Add this variable to track the last sunk ball and whether player is stripes or solids
let lastSunkBall = null;
let playerIsStripes = null; // Will be set after first ball is sunk

// Add to global variables at top
let score = 0;
let pocketedBalls = []; // Array to track pocketed balls in order

// Wait for DOM to be loaded before initializing everything
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    
    // First initialize UI
    createUIElements();
    
    // Then initialize the game
    balls = initializeGame(); // Assign to global balls variable
    
    // Set up mouse event handlers
    setupMouseHandlers(balls);
    
    // Start the animation loop
    animate();
});

function setupMouseHandlers(balls) {
    let shotCancelled = false;  // Track if shot was cancelled

    // Add keyboard event listener for Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const cueBall = balls.find(ball => ball.number === 0);
            if (cueBall && cueBall.isDragging) {
                cueBall.isDragging = false;
                // Reset drag position to prevent movement
                cueBall.startDragX = cueBall.x;
                cueBall.startDragY = cueBall.y;
                shotCancelled = true;
                console.log('Shot cancelled with Escape key');
            }
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const cueBall = balls.find(ball => ball.number === 0);
        if (cueBall && cueBall.isAiming) {
            cueBall.isDragging = true;
            cueBall.startDragX = mouseX;
            cueBall.startDragY = mouseY;
            shotCancelled = false;  // Reset shot cancelled flag
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const cueBall = balls.find(ball => ball.number === 0);
        if (cueBall) {
            cueBall.mouseX = mouseX;
            cueBall.mouseY = mouseY;
            
            // Check if mouse is near cue ball to show aim line
            const distToBall = Math.hypot(mouseX - cueBall.x, mouseY - cueBall.y);
            const wasAiming = cueBall.isAiming;
            cueBall.isAiming = distToBall < 150;
            
            if (cueBall.isDragging) {
                cueBall.startDragX = mouseX;
                cueBall.startDragY = mouseY;
            }
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        const cueBall = balls.find(ball => ball.number === 0);
        if (cueBall.isDragging) {
            if (!shotCancelled) {  // Only process the shot if not cancelled
                const dx = cueBall.x - cueBall.startDragX;
                const dy = cueBall.y - cueBall.startDragY;
                const distance = Math.hypot(dx, dy);
                
                if (distance > 0) {
                    const power = Math.min(distance / 4, 250) * cueSensitivity;
                    
                    // Normalize the direction and apply power
                    const dirX = dx / distance;
                    const dirY = dy / distance;
                    
                    // Apply base velocity
                    cueBall.dx = dirX * power;
                    cueBall.dy = dirY * power;
                    
                    // Apply initial spin effects
                    if (Math.abs(cueBall.spin) > 0.01 || Math.abs(cueBall.sideSpin) > 0.01) {
                        const spinPower = power * 0.2;
                        cueBall.dx += cueBall.sideSpin * spinPower * -dirY;
                        cueBall.dy += cueBall.sideSpin * spinPower * dirX;
                        cueBall.dx *= (1 + cueBall.spin * 0.2);
                        cueBall.dy *= (1 + cueBall.spin * 0.2);
                    }
                    
                    shotCount++;
                    console.log('Shot taken with spin:', {
                        topSpin: cueBall.spin,
                        sideSpin: cueBall.sideSpin,
                        power: power
                    });
                    ballHitSound.currentTime = 0;
                    ballHitSound.play().catch(e => console.error('Error playing collision sound:', e));
                    
                    // Reset spin control after shot
                    resetSpinControl();
                }
            }
            // Always reset these states
            cueBall.isDragging = false;
            cueBall.startDragX = cueBall.x;  // Reset drag position
            cueBall.startDragY = cueBall.y;
            shotCancelled = false;
        }
    });
}

// Update createUIElements function to modify the sliders
function createUIElements() {
    console.log('Creating UI elements...');
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    
    // Simpler, more direct selectors
    const allSliders = document.querySelectorAll('.control-row input[type="range"]');
    const cuePowerSlider = allSliders[0];  // First slider
    const pocketSizeSlider = allSliders[1]; // Second slider
    
    // Modify slider attributes for better UX
    if (cuePowerSlider) {
        cuePowerSlider.min = "1";
        cuePowerSlider.max = "10";
        cuePowerSlider.step = "0.5";
        cuePowerSlider.value = "5"; // Default value
    }
    
    if (pocketSizeSlider) {
        pocketSizeSlider.min = "0.8"; // Minimum size that allows balls to pass
        pocketSizeSlider.max = "1.5";  // Maximum size for easier gameplay
        pocketSizeSlider.step = "0.1";
        pocketSizeSlider.value = "1.0"; // Default value
    }

    // Set up modal controls first (independent of sliders)
    settingsButton.addEventListener('click', () => {
        console.log('Settings button clicked');
        settingsModal.style.display = 'flex';
    });

    closeSettings.addEventListener('click', () => {
        console.log('Close button clicked');
        settingsModal.style.display = 'none';
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            console.log('Modal background clicked');
            settingsModal.style.display = 'none';
        }
    });

    // Set up sliders if they exist
    if (cuePowerSlider && pocketSizeSlider) {
        console.log('Setting up slider controls');
        const cuePowerValue = cuePowerSlider.nextElementSibling;
        const pocketSizeValue = pocketSizeSlider.nextElementSibling;

        // Update initial values
        cuePowerValue.textContent = "5.0";
        pocketSizeValue.textContent = "1.0";

        cuePowerSlider.addEventListener('input', (e) => {
            const displayValue = parseFloat(e.target.value);
            // Convert display value (1-10) to internal power value (0.2-2.0)
            const internalValue = (displayValue / 5);
            cueSensitivity = internalValue;
            cuePowerValue.textContent = displayValue.toFixed(1);
            console.log('Cue power updated:', displayValue, 'internal:', internalValue);
        });

        pocketSizeSlider.addEventListener('input', (e) => {
            const displayValue = parseFloat(e.target.value);
            // Convert display value to internal value (1.0 display = 1.2 internal)
            const internalValue = displayValue * 1.2;
            tableConfig.pocketSensitivity = internalValue;
            pocketSizeValue.textContent = displayValue.toFixed(1);
            console.log('Pocket size updated:', {
                display: displayValue,
                internal: internalValue
            });
        });
    } else {
        console.error('Could not find sliders:', {
            numberOfSliders: allSliders.length,
            controlRows: document.querySelectorAll('.control-row').length
        });
    }

    // Set up spin controls (both modal and floating)
    setupSpinControls('.spin-cell');
}

function setupSpinControls(selector) {
    const spinCells = document.querySelectorAll('.static-spin-control ' + selector);
    let selectedSpinCell = document.querySelector('.static-spin-control ' + `${selector}[data-spin="0"][data-side="0"]`);
    selectedSpinCell.classList.add('selected');

    spinCells.forEach(cell => {
        cell.addEventListener('click', () => {
            // Update selected cell
            selectedSpinCell.classList.remove('selected');
            cell.classList.add('selected');
            selectedSpinCell = cell;

            // Update cue ball spin values
            const cueBall = balls.find(ball => ball.number === 0);
            if (cueBall) {
                cueBall.spin = parseFloat(cell.dataset.spin);
                cueBall.sideSpin = parseFloat(cell.dataset.side);
            }
        });
    });
}

// Create the balls
function initializeGame() {
    console.log('Initializing game...');
    initializeSounds();
    const balls = [];
    const radius = 20;
    
    // Add cue ball on the left side
    const cueBall = new Ball(
        tableConfig.feltX + tableConfig.feltWidth * 0.25,
        canvas.height/2,
        radius, 
        0
    );
    balls.push(cueBall);
    
    // Setup rack position on the right side
    const rackPosition = {
        x: tableConfig.feltX + tableConfig.feltWidth * 0.75,
        y: canvas.height/2
    };
    
    // Create rack positions
    const positions = createRackPositions(rackPosition.x, rackPosition.y, radius);
    
    // Define the rack arrangement exactly as shown in the image
    // First ball at the apex, 8 ball in the center, stripes and solids alternating
    const rackOrder = [
        1,                // Apex (yellow solid)
        9, 10,           // Second row (yellow stripe, blue stripe)
        2, 8, 3,         // Third row with 8-ball in center
        4, 7, 6, 5,      // Fourth row
        15, 14, 13, 12, 11  // Back row
    ];

    // Place balls according to rack order
    for (let i = 0; i < rackOrder.length; i++) {
        const number = rackOrder[i];
        const pos = positions[i];
        const isStriped = number > 8;
        balls.push(new Ball(pos.x, pos.y, radius, number, isStriped));
    }
    
    return balls;
}

// Add at the top of the file with other global variables
let shotCount = 0;

// Update the cue ball starting position
function respawnCueBall() {
    const cueBall = balls.find(ball => ball.number === 0);
    if (cueBall.pocketed) {
        cueBall.pocketed = false;
        cueBall.x = tableConfig.feltX + tableConfig.feltWidth * 0.25;
        cueBall.y = canvas.height/2;
        cueBall.dx = 0;
        cueBall.dy = 0;
        
        if (lastSunkBall && lastSunkBall.pocketed) {
            // Remove ball from pocketed balls array
            pocketedBalls = pocketedBalls.filter(ball => ball.number !== lastSunkBall.number);
            // Subtract score
            score -= getBallValue(lastSunkBall.number);
            
            // Return ball to play
            const clearSpot = findClearSpot(balls);
            if (clearSpot) {
                lastSunkBall.pocketed = false;
                lastSunkBall.x = clearSpot.x;
                lastSunkBall.y = clearSpot.y;
                lastSunkBall.dx = 0;
                lastSunkBall.dy = 0;
                console.log(`Returning ball ${lastSunkBall.number} to play`);
            }
        }
    }
}

// Add function to find a clear spot for ball placement
function findClearSpot(balls) {
    const spotRadius = 30; // Search radius for clear spot
    const gridSize = 40; // Distance between test points
    
    // Start searching from the center of the table
    const centerX = tableConfig.feltX + tableConfig.feltWidth * 0.75;
    const centerY = canvas.height/2;
    
    // Check spots in expanding grid
    for (let offset = 0; offset <= Math.max(tableConfig.feltWidth, tableConfig.feltHeight)/2; offset += gridSize) {
        // Check points in a square pattern
        for (let dx = -offset; dx <= offset; dx += gridSize) {
            for (let dy = -offset; dy <= offset; dy += gridSize) {
                const testX = centerX + dx;
                const testY = centerY + dy;
                
                // Make sure point is on the table
                if (testX < tableConfig.feltX + 40 || 
                    testX > tableConfig.feltX + tableConfig.feltWidth - 40 ||
                    testY < tableConfig.feltY + 40 || 
                    testY > tableConfig.feltY + tableConfig.feltHeight - 40) {
                    continue;
                }
                
                // Check if spot is clear
                let spotIsClear = true;
                for (const ball of balls) {
                    if (!ball.pocketed) {
                        const dist = Math.hypot(ball.x - testX, ball.y - testY);
                        if (dist < spotRadius) {
                            spotIsClear = false;
                            break;
                        }
                    }
                }
                
                if (spotIsClear) {
                    return { x: testX, y: testY };
                }
            }
        }
    }
    
    return null;
}

// Add this function to draw the shot counter
function drawShotCounter(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Shots: ${shotCount}`, 20, 20);
}

// Update initializeSounds with more debugging
function initializeSounds() {
    console.log('Initializing sounds...');
    
    // Create and resume audio context on first user interaction
    document.addEventListener('click', function initAudio() {
        console.log('First click detected, initializing audio...');
        
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        console.log('Audio context created:', audioCtx.state);
        
        // Resume audio context
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log('Audio context resumed');
            });
        }
        
        // Load and test sounds with error handling
        ballHitSound.addEventListener('error', (e) => {
            console.error('Error loading ball hit sound:', e);
        });
        
        pocketSound.addEventListener('error', (e) => {
            console.error('Error loading pocket sound:', e);
        });
        
        // Test sound with better error handling
        ballHitSound.play()
            .then(() => {
                console.log('Test sound played successfully');
                ballHitSound.pause();  // Stop the test sound immediately
                ballHitSound.currentTime = 0;
            })
            .catch(e => {
                console.error('Error playing test sound:', e);
            });
        
        document.removeEventListener('click', initAudio);
    }, { once: true });
}

function calculateTrajectory(startX, startY, angle, distance) {
    return {
        x: startX + Math.cos(angle) * distance,
        y: startY + Math.sin(angle) * distance
    };
}

function drawTrajectoryLines(ctx, cueBall) {
    if (!cueBall.isDragging) return;

    const dx = cueBall.x - cueBall.startDragX;
    const dy = cueBall.y - cueBall.startDragY;
    const distance = Math.hypot(dx, dy);
    const power = Math.min(distance / 6, 160) * cueSensitivity;
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Draw cue ball trajectory
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    
    let closestBall = null;
    let closestDistance = Infinity;
    let collisionPoint = null;
    
    // Find the first ball that would be hit
    for (const ball of balls) {
        if (ball === cueBall || ball.pocketed) continue;
        
        // Vector from cue ball to target ball
        const toBallX = ball.x - cueBall.x;
        const toBallY = ball.y - cueBall.y;
        
        // Project ball position onto shot direction
        const dot = (toBallX * dirX + toBallY * dirY);
        if (dot < 0) continue; // Ball is behind the cue ball
        
        // Find closest point on shot line to target ball
        const closestX = cueBall.x + dirX * dot;
        const closestY = cueBall.y + dirY * dot;
        
        // Distance from closest point to target ball center
        const perpX = ball.x - closestX;
        const perpY = ball.y - closestY;
        const perpDist = Math.hypot(perpX, perpY);
        
        // Check if shot line passes close enough to hit the ball
        if (perpDist < ball.radius * 2 && dot < closestDistance) {
            closestBall = ball;
            closestDistance = dot;
            
            // Calculate exact collision point
            const impactDist = Math.sqrt(Math.pow(ball.radius * 2, 2) - Math.pow(perpDist, 2));
            collisionPoint = {
                x: closestX - dirX * impactDist,
                y: closestY - dirY * impactDist
            };
        }
    }
    
    if (closestBall) {
        // Draw cue ball path to collision
        ctx.lineTo(collisionPoint.x, collisionPoint.y);
        ctx.stroke();
        
        // Calculate object ball's path after collision
        const toBallX = closestBall.x - collisionPoint.x;
        const toBallY = closestBall.y - collisionPoint.y;
        const hitDist = Math.hypot(toBallX, toBallY);
        
        // Calculate the angle of impact
        const hitAngle = Math.atan2(toBallY, toBallX);
        
        // Calculate the object ball's direction after impact
        const objDirX = Math.cos(hitAngle);
        const objDirY = Math.sin(hitAngle);
        
        // Draw object ball's predicted path
        ctx.beginPath();
        ctx.moveTo(closestBall.x, closestBall.y);
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        
        // Project object ball's path
        const objEndX = closestBall.x + objDirX * 500;
        const objEndY = closestBall.y + objDirY * 500;
        ctx.lineTo(objEndX, objEndY);
        ctx.stroke();
        
        // Draw ghost ball (optional - helps visualize the point of contact)
        ctx.beginPath();
        ctx.arc(collisionPoint.x + objDirX * closestBall.radius * 2, 
                collisionPoint.y + objDirY * closestBall.radius * 2, 
                closestBall.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();
    } else {
        // No collision, draw straight line
        const endX = cueBall.x + dirX * 500;
        const endY = cueBall.y + dirY * 500;
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
}

// Start the game
animate();

// Update the pocket physics
function isNearPocket(x, y, pocket, ballRadius) {
    const dx = x - pocket.x;
    const dy = y - pocket.y;
    const distToPocket = Math.hypot(dx, dy);
    
    const isCornerPocket = (pocket.x === tableConfig.feltX || pocket.x === tableConfig.feltX + tableConfig.feltWidth) &&
                          (pocket.y === tableConfig.feltY || pocket.y === tableConfig.feltY + tableConfig.feltHeight);

    // Adjust pocket radius based on sensitivity
    const baseRadius = isCornerPocket ? tableConfig.cornerPocketRadius : tableConfig.middlePocketRadius;
    const adjustedRadius = baseRadius * tableConfig.pocketSensitivity;
    
    // Add a safety margin to prevent balls from escaping
    const safetyMargin = ballRadius * 0.5;
    
    if (isCornerPocket) {
        // Stricter corner pocket checks
        if (distToPocket < adjustedRadius + ballRadius - safetyMargin) {
            // Ball is definitely going in
            return { isPocketed: true };
        }
        
        if (distToPocket < adjustedRadius * 1.5) {
            const angleToPocket = Math.atan2(dy, dx);
            let idealAngle;
            
            // Calculate ideal angle based on pocket position
            if (pocket.x === tableConfig.feltX) {
                idealAngle = pocket.y === tableConfig.feltY ? Math.PI * 0.25 : -Math.PI * 0.25;
            } else {
                idealAngle = pocket.y === tableConfig.feltY ? Math.PI * 0.75 : -Math.PI * 0.75;
            }
            
            const angleDiff = Math.abs(normalizeAngle(angleToPocket - idealAngle));
            if (angleDiff < tableConfig.cornerPocketAngle * tableConfig.pocketSensitivity) {
                // Apply stronger pull towards pocket center
                const pullStrength = 0.8 * tableConfig.pocketSensitivity;
                return {
                    isPocketed: true,
                    pullX: (pocket.x - x) * pullStrength,
                    pullY: (pocket.y - y) * pullStrength
                };
            }
        }
    } else {
        // Middle pockets with adjusted sensitivity
        if (distToPocket < adjustedRadius + ballRadius - safetyMargin) {
            const angleToPocket = Math.atan2(dy, dx);
            const isTopPocket = pocket.y === tableConfig.feltY;
            const properApproachAngle = isTopPocket ? Math.PI / 2 : -Math.PI / 2;
            const angleDiff = Math.abs(normalizeAngle(angleToPocket - properApproachAngle));
            
            if (angleDiff < Math.PI / 3 * tableConfig.pocketSensitivity) {
                return { isPocketed: true };
            }
        }
    }
    
    return { isPocketed: false };
}

// Helper function to normalize angles
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

// Update the shouldBounce function to use the sensitivity setting
function shouldBounce(x, y, pockets, tableConfig) {
    return !pockets.some(pocket => {
        const distToPocket = Math.hypot(x - pocket.x, y - pocket.y);
        
        const isCornerPocket = (pocket.x === tableConfig.feltX || pocket.x === tableConfig.feltX + tableConfig.feltWidth) &&
                              (pocket.y === tableConfig.feltY || pocket.y === tableConfig.feltY + tableConfig.feltHeight);
        const isMiddlePocket = !isCornerPocket;
        
        // Adjust clearance based on sensitivity
        if (isCornerPocket) {
            return distToPocket < tableConfig.pocketRadius * 2 * tableConfig.pocketSensitivity;
        } else if (isMiddlePocket) {
            const pocketAngle = Math.atan2(y - pocket.y, x - pocket.x);
            const clearance = tableConfig.pocketRadius * 1.8 * tableConfig.pocketSensitivity;
            
            if (distToPocket < clearance) {
                const isTopPocket = pocket.y === tableConfig.feltY;
                const properApproachAngle = isTopPocket ? Math.PI / 2 : -Math.PI / 2;
                const angleDiff = Math.abs(normalizeAngle(pocketAngle - properApproachAngle));
                return angleDiff < (Math.PI / 2) * tableConfig.pocketSensitivity;
            }
        }
        
        return distToPocket < tableConfig.pocketRadius * 1.5 * tableConfig.pocketSensitivity;
    });
}

// Update the animation loop to include trajectory lines
function animate() {
    if (!balls || !balls.length) return; // Don't animate if balls aren't initialized

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTable(ctx, canvas);
    
    // Check if cue ball needs respawning
    const cueBall = balls.find(ball => ball.number === 0);
    if (cueBall && cueBall.pocketed) {
        respawnCueBall();
    }
    
    // Draw trajectory lines before drawing balls
    if (cueBall) {
        drawTrajectoryLines(ctx, cueBall);
    }
    
    balls.forEach(ball => {
        ball.update(canvas, balls);
        if (!ball.pocketed) {
            ball.draw(ctx);
        }
    });
    
    drawShotCounter(ctx);
    
    // Draw game over message if needed
    if (gameOverOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${gameOverOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${gameOverOpacity})`;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gameOverMessage, canvas.width/2, canvas.height/2);
        
        // Fade out the message
        if (!gameOver) {
            gameOverOpacity = Math.max(0, gameOverOpacity - 0.02);
        }
    }
    
    drawScoreArea(ctx);
    
    requestAnimationFrame(animate);
}

// Start the game
animate();

// Add the restartGame function
function restartGame() {
    // Reset game state
    balls.length = 0; // Clear all balls
    balls.push(...initializeGame()); // Reinitialize balls
    shotCount = 0;
    score = 0;
    pocketedBalls = [];
    gameOver = false;
}

// Add this helper function
function resetSpinControl() {
    // Find and reset the selected spin cell
    const allSpinCells = document.querySelectorAll('.static-spin-control .spin-cell');
    const centerCell = document.querySelector('.static-spin-control .spin-cell[data-spin="0"][data-side="0"]');
    
    allSpinCells.forEach(cell => cell.classList.remove('selected'));
    centerCell.classList.add('selected');
    
    // Reset cue ball spin values
    const cueBall = balls.find(ball => ball.number === 0);
    if (cueBall) {
        cueBall.spin = 0;
        cueBall.sideSpin = 0;
    }
}

// Add function to calculate ball value
function getBallValue(number) {
    if (number === 0) return 0; // cue ball
    if (number === 8) return 8; // 8 ball
    return number <= 8 ? number : (15 - number + 1); // 1-7 = value, 9-15 = 7-1
}

// Update the drawScoreArea function
function drawScoreArea(ctx) {
    // Score and shots in top left corner
    const scoreX = tableConfig.feltX + 20;
    const scoreY = tableConfig.feltY - 60;

    // Draw score with larger, bold font and gold color
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#ffd700';  // Gold color
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${score}`, scoreX, scoreY);

    // Draw "shots" smaller and below in white
    ctx.font = '18px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Shots: ${shotCount}`, scoreX, scoreY + 30);

    // Draw pocketed balls along the top
    const ballsStartX = tableConfig.feltX + 150; // Start after the score
    const ballsY = scoreY + 10; // Align with score
    const ballRadius = 12;
    const padding = 5;

    // Draw pocketed balls in a single row
    pocketedBalls.forEach((ball, index) => {
        const x = ballsStartX + (ballRadius * 2 + padding) * index;

        // Draw ball shadow
        ctx.beginPath();
        ctx.arc(x + ballRadius + 1, ballsY + ballRadius + 1, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Draw ball
        ctx.beginPath();
        ctx.arc(x + ballRadius, ballsY + ballRadius, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = ball.getBaseColor();
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw stripes if needed
        if (ball.isStriped) {
            ctx.beginPath();
            ctx.arc(x + ballRadius, ballsY + ballRadius, ballRadius, 0.25 * Math.PI, 0.75 * Math.PI);
            ctx.arc(x + ballRadius, ballsY + ballRadius, ballRadius, 1.25 * Math.PI, 1.75 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        // Draw number
        ctx.fillStyle = ball.isStriped ? 'white' : 'black';
        ctx.font = `bold ${ballRadius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), x + ballRadius, ballsY + ballRadius);
    });
} 