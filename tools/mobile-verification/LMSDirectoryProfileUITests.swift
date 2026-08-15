//
//  LMSDirectoryProfileUITests.swift
//
//  Drives the running app against a stub LMS to see the Profile tab as a signed-in
//  learner. Local verification only — not part of the shipped project.
//

import XCTest

final class LMSDirectoryProfileUITests: XCTestCase {

    func testProfileReportingMatchesTheConfiguredDirectory() {
        let app = XCUIApplication()
        app.launch()

        // A signed-in build skips straight to the dashboard — which is the case
        // this test cares most about, because it is the one where the platform
        // picker never runs and a remembered answer would go unchallenged.
        let platform = app.staticTexts["Stub College"].firstMatch
        if platform.waitForExistence(timeout: 20) {
            platform.tap()

            // Sign in against the stub.
            let email = app.textFields["username_textfield"].firstMatch
            XCTAssertTrue(email.waitForExistence(timeout: 10), "sign-in form never appeared")
            email.tap()
            email.typeText("night_tester@example.com")

            // A SecureField refuses synthesized input; the screen's own reveal button
            // turns it into a plain field, which accepts it.
            app.buttons.matching(identifier: "password_textfield").firstMatch.tap()
            Thread.sleep(forTimeInterval: 1)
            let revealed = app.textFields.matching(identifier: "password_textfield").firstMatch
            XCTAssertTrue(revealed.waitForExistence(timeout: 5), "password field never became visible")
            revealed.tap()
            XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "no keyboard for the password")
            Thread.sleep(forTimeInterval: 1)
            app.typeText("stubpassword")
            XCTAssertEqual(revealed.value as? String, "stubpassword", "password did not land in the field")

            app.buttons["Sign in"].firstMatch.tap()
        }

        // Reach the Profile tab.
        let profileTab = app.buttons["Profile"].firstMatch
        if !profileTab.waitForExistence(timeout: 30) {
            print("HIERARCHY-START")
            print(app.debugDescription)
            print("HIERARCHY-END")
            XCTFail("never signed in")
            return
        }
        profileTab.tap()

        let editProfile = app.buttons["Edit Profile"].firstMatch
        XCTAssertTrue(editProfile.waitForExistence(timeout: 20), "Profile tab never rendered")

        // What this test exists for: whether "Report this LMS" is offered.
        let reporting = app.buttons["Report this LMS"].firstMatch
        let expected = ProcessInfo.processInfo.environment["EXPECT_REPORTING"] == "1"
        let present = reporting.waitForExistence(timeout: 5)
        XCTAssertEqual(present, expected, "reporting entry point present=\(present), expected=\(expected)")

        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.lifetime = .keepAlways
        shot.name = expected ? "profile-service" : "profile-document"
        add(shot)
    }
}
