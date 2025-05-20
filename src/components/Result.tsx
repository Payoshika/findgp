import React from "react";
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
  const calculateConfidenceScore = (
    rating: number,
    totalRatings: number
  ): number => {
    if (totalRatings === 0) return 0;

    // Normalize rating from 0-5 scale to 0-1 scale
    const p = rating / 5;

    // z score for 95% confidence interval is ~1.96
    const z = 1.96;

    const numerator = p + (z * z) / (2 * totalRatings);
    const denominator = 1 + (z * z) / totalRatings;
    const radicand =
      (p * (1 - p)) / totalRatings +
      (z * z) / (4 * totalRatings * totalRatings);

    return ((numerator - z * Math.sqrt(radicand)) / denominator) * 5; // Convert back to 5-star scale
  };

  // Get confidence level description
  const getConfidenceLevelDescription = (score: number): string => {
    if (score >= 4.5) return "Exceptional";
    if (score >= 4.0) return "Very High";
    if (score >= 3.5) return "High";
    if (score >= 3.0) return "Good";
    if (score >= 2.5) return "Average";
    if (score >= 2.0) return "Fair";
    if (score >= 1.0) return "Low";
    return "Insufficient Data";
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
    const confidenceLabel = getConfidenceLevelDescription(confidenceScore);

    return (
      <div
        className={`confidence-badge confidence-${confidenceLabel
          .toLowerCase()
          .replace(" ", "-")}`}
        title={`Statistical confidence score: ${confidenceScore.toFixed(
          1
        )}/5. Based on rating and number of reviews.`}
      >
        {confidenceLabel} Confidence
      </div>
    );
  };

  return (
    <div className="results-container">
      <h2>GP Practices Found ({searchResults.length})</h2>

      <div className="results-list-header">
        <p className="confidence-info">
          Results are ranked by a confidence score that considers both rating
          and number of reviews
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
            {result.isTopThree && <div className="top-badge">TOP RATED</div>}

            <h3>{result.name}</h3>
            <p className="vicinity">{result.vicinity}</p>

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
          </div>
        ))}
      </div>

      {selectedResult && (
        <div className="selected-result">
          <h3>Selected Practice</h3>
          <h4>{selectedResult.name}</h4>
          <p>{selectedResult.vicinity}</p>

          {selectedResult.rating > 0 ? (
            <div className="selected-result-details">
              <div className="rating-container">
                {renderRating(selectedResult.rating)}
                <span className="review-count">
                  ({selectedResult.user_ratings_total} reviews)
                </span>
              </div>
              {renderConfidenceBadge(
                selectedResult.rating,
                selectedResult.user_ratings_total
              )}

              <div className="confidence-explanation">
                <p>
                  <strong>What is confidence score?</strong> It's a statistical
                  measure that considers both the rating and number of reviews.
                  A GP with many reviews has more reliable ratings than one with
                  few reviews.
                </p>
              </div>
            </div>
          ) : (
            <div className="no-rating">No ratings yet</div>
          )}

          <div className="result-actions">
            <a
              href={`https://www.google.com/maps/place/?q=place_id:${selectedResult.place_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="view-on-google"
            >
              View on Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Result;
