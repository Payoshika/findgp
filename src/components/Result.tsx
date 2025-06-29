import { useMapContext } from "../context/MapContext";

const Result = () => {
  const { state, dispatch } = useMapContext();
  const { searchResults, selectedResult } = state;

  if (searchResults.length === 0) {
    return null; // Don't render anything if no results
  }

  const handleResultClick = (result: any) => {
    dispatch({ type: "SELECT_RESULT", payload: result });
  };

  // Calculate Wilson score confidence interval for a rating
  // Modified calculation that requires a minimum number of reviews to get a high score
  const calculateConfidenceScore = (
    rating: number,
    totalRatings: number
  ): number => {
    if (totalRatings === 0) return 0;

    // Set a minimum threshold for reviews to qualify for top ratings
    // This will severely penalize places with very few reviews
    const minimumReviewsThreshold = 5;
    const reviewThresholdPenalty =
      totalRatings < minimumReviewsThreshold
        ? (minimumReviewsThreshold - totalRatings) * 0.5
        : 0;

    // Normalize rating from 0-5 scale to 0-1 scale
    const p = rating / 5;

    // z score for 95% confidence interval is ~1.96
    const z = 1.96;

    // Basic Wilson score calculation
    const numerator = p + (z * z) / (2 * totalRatings);
    const denominator = 1 + (z * z) / totalRatings;
    const radicand =
      (p * (1 - p)) / totalRatings +
      (z * z) / (4 * totalRatings * totalRatings);

    const wilsonScore =
      ((numerator - z * Math.sqrt(radicand)) / denominator) * 5;

    // Apply a review count bonus (logarithmic scale to prevent excessive domination)
    // Increased weight to prioritize places with many reviews
    const reviewCountBonus = Math.log10(totalRatings + 1) * 0.4;

    // Add a rating bonus for high-rated places (4.5+)
    // This will give a boost to places with excellent ratings
    const ratingBonus = rating >= 4.5 ? 0.3 : rating >= 4.0 ? 0.15 : 0;

    // Apply the review threshold penalty and cap the final score at 5.0
    return Math.max(
      0,
      Math.min(
        wilsonScore + reviewCountBonus + ratingBonus - reviewThresholdPenalty,
        5.0
      )
    );
  };

  // Helper function to render star rating
  const renderRating = (rating: number) => {
    // Round to nearest half
    const roundedRating = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    const halfStar = roundedRating % 1 !== 0;

    return (
      <div className="star-rating">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return (
              <span key={i} className="star full">
                ★
              </span>
            );
          } else if (i === fullStars && halfStar) {
            return (
              <span key={i} className="star half">
                ★
              </span>
            );
          } else {
            return (
              <span key={i} className="star empty">
                ☆
              </span>
            );
          }
        })}
        <span className="rating-number">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Render confidence score badge
  const renderConfidenceBadge = (rating: number, totalRatings: number) => {
    const confidenceScore = calculateConfidenceScore(rating, totalRatings);
    // Update the confidence level descriptions
    const getConfidenceLevelDescription = (score: number): string => {
      if (score >= 4.7) return "Exceptional";
      if (score >= 4.2) return "Very High";
      if (score >= 3.7) return "High";
      if (score >= 3.2) return "Good";
      if (score >= 2.7) return "Average";
      if (score >= 2.2) return "Fair";
      if (score >= 1.5) return "Low";
      return "Insufficient Data";
    };
    return (
      <div
        className={`confidence-badge confidence-${getConfidenceLevelDescription(
          confidenceScore
        )
          .toLowerCase()
          .replace(" ", "-")}`}
        title={`Statistical confidence score: ${confidenceScore.toFixed(
          1
        )}/5. Based on rating and number of reviews.`}
      >
        {getConfidenceLevelDescription(confidenceScore)} Confidence
      </div>
    );
  };

  return (
    <div className="results results-container">
      <h2>GP Practices Found ({searchResults.length})</h2>
      <div className="results-list-header">
        <p className="confidence-info">
          <strong>
            Results are ranked by a confidence score that considers both rating
            and number of reviews
          </strong>
        </p>
      </div>
      <div className="results-list">
        {searchResults.map((result) => (
          <div
            key={result.id}
            className={`result-item ${
              selectedResult?.id === result.id ? "selected" : ""
            } ${result.isTopThree ? "top-three" : ""}`}
            onClick={() => handleResultClick(result)}
          >
            {result.isTopThree ? (
              <div className="top-badge">TOP RATED</div>
            ) : (
              <div className="order-badge">
                {searchResults.indexOf(result) + 1}
              </div>
            )}
            {result.isPrivatePractice && (
              <div className="private-badge">PRIVATE</div>
            )}
            <h3>{result.name}</h3>
            {result.rating > 0 ? (
              <div className="result-details">
                <div className="rating-container">
                  {renderRating(result.rating)}
                  <span className="review-count">
                    ({result.user_ratings_total} reviews)
                  </span>
                </div>
                {renderConfidenceBadge(
                  result.rating,
                  result.user_ratings_total
                )}
              </div>
            ) : (
              <div className="no-rating">No ratings yet</div>
            )}
            <p className="vicinity">📍{result.vicinity}</p>
            {/* Contact details section */}
            <div className="result-contact-details">
              {/* Phone number - if available */}
              {result.phone_number && (
                <div className="contact-item phone">
                  <span className="contact-icon">📞</span>
                  <a
                    href={`tel:${result.phone_number}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.phone_number}
                  </a>
                </div>
              )}

              {/* Website - if available */}
              {result.website && (
                <div className="contact-item website">
                  <span className="contact-icon">🌐</span>
                  <a
                    href={result.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Visit website
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Result;
