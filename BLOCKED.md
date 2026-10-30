# Mobile integration verification limits

The backend regression suite is run with `./verify.sh`; see
[CONTRIBUTING.md](CONTRIBUTING.md) for setup and frontend checks.

The mobile integration checks in [tools/mobile-verification/](tools/mobile-verification/)
exercise the Profile tab against a strict local stand-in LMS. They cover iOS and
Android reading a directory document or a registry service, including retaining
a signed-in session while changing the directory source. Reporting is offered
only when a registry service is available.

These checks prove the client behavior against the documented API responses.
They do not prove compatibility with every live Open edX deployment. To verify a
real deployment, supply its HTTPS base URL, a mobile OAuth client ID, and a test
learner account through your local environment. Do not commit credentials or
screenshots containing learner information.

The mobile apps are maintained separately. Run their current build and test
instructions when validating an integration; historical local build results do
not describe the status of their current branches.
