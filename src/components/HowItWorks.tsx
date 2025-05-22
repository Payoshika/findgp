import React from "react";

const HowItWorks = () => {
  return (
    <div className="how-it-works-container">
      <h1>How FindGP Works</h1>

      <section className="intro-section">
        <div className="section-content">
          <p>
            FindGP uses advanced algorithms to help you discover highly-rated GP
            practices in your area. Here's how our service works to connect you
            with quality healthcare providers.
          </p>
        </div>
      </section>

      <section className="process-section">
        <h2>Our Process</h2>

        <div className="process-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Data Collection</h3>
            <p>When you search for a location, we:</p>
            <ul>
              <li>
                Query Google Maps for GP practices, doctors, and general
                practitioners within a 2km radius
              </li>
              <li>
                Collect comprehensive information including ratings, number of
                reviews, contact details, and opening hours
              </li>
              <li>
                Identify whether practices are NHS or private (when that
                information is available)
              </li>
            </ul>
          </div>
        </div>

        <div className="process-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Our Ranking Algorithm</h3>
            <p>
              We use a modified Wilson score confidence interval to rank GP
              practices. This statistical approach balances:
            </p>
            <ul>
              <li>
                <strong>Rating Quality</strong>: The average star rating (1-5
                stars)
              </li>
              <li>
                <strong>Rating Quantity</strong>: The total number of patient
                reviews
              </li>
              <li>
                <strong>Statistical Confidence</strong>: How reliable the rating
                is based on sample size
              </li>
            </ul>

            <div className="algorithm-details">
              <p>
                Our formula prioritizes practices with both high ratings AND
                sufficient reviews to be statistically meaningful, using:
              </p>
              <div className="formula">
                Score = ((p + z²/2n - z√(p(1-p)/n + z²/4n²))/1+z²/n) × 5 +
                log₁₀(n+1) × 0.4 + ratingBonus - reviewThresholdPenalty
              </div>

              <p>Where:</p>
              <ul className="formula-variables">
                <li>
                  <code>p</code> = normalized rating (0-1 scale)
                </li>
                <li>
                  <code>z</code> = 1.96 (z-score for 95% confidence)
                </li>
                <li>
                  <code>n</code> = number of reviews
                </li>
              </ul>

              <p>Additional factors:</p>
              <ul>
                <li>
                  <strong>Review Threshold</strong>: Practices with fewer than 5
                  reviews receive a scoring penalty
                </li>
                <li>
                  <strong>High Rating Bonus</strong>: Excellent practices (4.5+
                  stars) receive a small boost
                </li>
                <li>
                  <strong>Review Volume Bonus</strong>: Practices with many
                  reviews receive a logarithmic bonus
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="process-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>Private Practice Filtering</h3>
            <p>
              By default, we filter out private practices to focus on
              NHS-accessible care. Our system:
            </p>
            <ul>
              <li>Excludes results with "private" in their name</li>
              <li>Analyzes practice websites to identify fee-based services</li>
              <li>
                Provides an option to include private practices if desired
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="caution-section">
        <div className="caution-box">
          <h2>⚠️ Important Caution</h2>
          <p>
            <strong>Please Note</strong>: Google Maps reviews may not fully
            reflect the true quality of medical care. Reviews often focus on
            administrative aspects (appointment booking, waiting times) rather
            than clinical outcomes.
          </p>
          <p>
            This tool should be used as just one of many references when
            choosing a GP. We recommend:
          </p>
          <ul>
            <li>Reading the actual reviews, not just the ratings</li>
            <li>
              Checking the{" "}
              <a
                href="https://www.nhs.uk/service-search/find-a-gp"
                target="_blank"
                rel="noopener noreferrer"
              >
                NHS website
              </a>{" "}
              for official quality metrics
            </li>
            <li>
              Consulting with friends, family or other healthcare professionals
            </li>
            <li>
              Contacting practices directly with specific questions about your
              healthcare needs
            </li>
          </ul>
          <p>
            FindGP is designed to give you a starting point in your search for
            quality healthcare, not to replace your own research and judgment.
          </p>
        </div>
      </section>

      <section className="feedback-section">
        <h2>Help Us Improve</h2>
        <p>
          We're constantly working to improve our algorithm and provide better
          results. If you have feedback or suggestions, please{" "}
          <a href="mailto:feedback@findgp.com">let us know</a>.
        </p>
      </section>
    </div>
  );
};

export default HowItWorks;
