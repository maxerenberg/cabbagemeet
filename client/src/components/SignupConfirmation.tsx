export default function VerifyEmailAddress({email}: {email: string}) {
  return (
    <div className="align-self-center" style={{width: 'min(100%, 600px)'}}>
      <h3>Signup Confirmation</h3>
      <hr className="my-4" />
      <p>
        A confirmation email was just sent to <strong>{email}</strong>.
      </p>
      <p>
        Please make sure to check your Junk folder if it does not arrive after
        a few minutes.
      </p>
    </div>
  );
}
