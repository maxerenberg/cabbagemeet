import SelectedDatesPicture from 'assets/help-section-selected-dates.png';
import SelectedTimesPicture from 'assets/help-section-selected-times.png';
import DateCheckmarkPicture from 'assets/help-section-date-checkmark.png';
import styles from './HowItWorksPage.module.css';

export default function HowItWorksPage() {
  return (
    <>
      <div>
        <h3>How it works</h3>
      </div>
      <InstructionStep
        stepNumber={1}
        title={"Choose the days when you'd like to meet."}
        body={"Select one or more days on which you'd like to meet with your group."}
        image={SelectedDatesPicture}
      />
      <InstructionStep
        stepNumber={2}
        title={"Choose the times when you're available."}
        body={"Select the times for which you're available on the dates which you selected."}
        image={SelectedTimesPicture}
      />
      <InstructionStep
        stepNumber={3}
        title={"Choose a time which works for everyone."}
        body={
          "Share the meeting link with your group and they'll select the times when" +
          " they're available. Everyone's availabilities will be placed on the same grid," +
          " making it easy to find the best time."
        }
        image={DateCheckmarkPicture}
      />
    </>
  );
}

function InstructionStep({
  stepNumber,
  title,
  body,
  image,
}: {
  stepNumber: number,
  title: string,
  body: string,
  image: string,
}) {
  return (
    <div className={`mt-5 d-flex flex-column flex-md-row align-items-md-center ${styles.helpStepContainer}`}>
      <div>
        <h5 className="text-primary">{stepNumber}&#41; {title}</h5>
        <p className="mt-4">{body}</p>
      </div>
      <div className={styles.imageContainer}>
        <img src={image} />
      </div>
    </div>
  );
}
