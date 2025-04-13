const scoreUi = document.createElement('p');
scoreUi.style.position = 'fixed';
scoreUi.style.fontSize = '2rem';
scoreUi.style.top = '10px';
scoreUi.style.left = '50px';
scoreUi.style.zIndex = '10';
scoreUi.style.color = 'white';
document.body.appendChild(scoreUi);

export const updateUi = (scoreBoard: { player1: number; player2: number }) => {
    scoreUi.innerText = `${scoreBoard.player1} - ${scoreBoard.player2}`;
};
