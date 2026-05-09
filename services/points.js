function calcPoints(score, hasPhoto) {
  let points;
  if (score <= 30)      points = 5;
  else if (score <= 60) points = 15;
  else if (score <= 80) points = 30;
  else                  points = 50;

  if (hasPhoto) points += 10;
  return points;
}

module.exports = { calcPoints };
