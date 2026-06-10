# Found Item Claim and Chatting Process Implementation Plan

This plan outlines the steps to implement the secure claim process for found items, requiring ownership verification via questions before allowing communication.

## User Review Required

> [!IMPORTANT]
> The chatting feature will be restricted for Found items. Users must successfully answer verification questions and have their claim request accepted by the finder before the "Message" button becomes active and the item appears in their chat list.

## Proposed Changes

### Found Report Flow Updates

#### [MODIFY] [FoundStep4.js](file:///c:/Users/HOME/Desktop/TrackBack%20App/FrontEnd/src/screens/reports/found/FoundStep4.js)
- Add state for 3 questions and 3 corresponding answers.
- Update the UI to include 3 question/answer input pairs.
- Pass all 6 fields (3 questions, 3 answers) to the next step.

#### [MODIFY] [FoundStep5.js](file:///c:/Users/HOME/Desktop/TrackBack%20App/FrontEnd/src/screens/reports/found/FoundStep5.js)
- Update the preview screen to display all 3 verification questions.
- (Answers will be hidden in the preview but saved to the database).

---

### Item Detail and Claim Flow

#### [MODIFY] [ItemDetailedViewScreen.js](file:///c:/Users/HOME/Desktop/TrackBack%20App/FrontEnd/src/screens/main/ItemDetailedViewScreen.js)
- For **Found** items:
    - Hide the "Message" button initially.
    - The "Claim Item" button will navigate to the verification flow.
    - After a claim is accepted, show the "Message" button.

#### [MODIFY] [OwnershipVerificationScreen.js](file:///c:/Users/HOME/Desktop/TrackBack%20App/FrontEnd/src/screens/requests/OwnershipVerificationScreen.js)
- Display the 3 questions stored with the found item.
- Provide input fields for the claimer to enter answers.
- Implement a "Check Answers" logic:
    - Compare entered answers with the stored answers (case-insensitive).
    - If match: Show "Send Request" button.
    - If mismatch: Show "Answer not matched plz try again or may these is not your item".

---

### Request Management

#### [NEW] [requestService.js](file:///c:/Users/HOME/Desktop/TrackBack%20App/FrontEnd/src/services/requestService.js)
- Create a service to handle claim requests in Firestore.
- Functions: `sendClaimRequest`, `getIncomingRequests`, `updateRequestStatus` (Accept/Reject).

#### [MODIFY] [ReviewAccessRequestScreen.js](file:///c:/Users/HOME/Desktop/TrackBack%20App/FrontEnd/src/screens/requests/ReviewAccessRequestScreen.js)
- Implement the "Accept" and "Reject" logic.
- When "Accept" is clicked, update the request status and potentially create a chat entry or flag the relationship as "allowed".

---

### Chat Integration

#### [MODIFY] [ChatListScreen.js](file:///c:/Users/HOME/Desktop/TrackBack%20App/FrontEnd/src/screens/main/ChatListScreen.js)
- Update the chat list logic to only show chats for found items if a claim request has been accepted.

## Verification Plan

### Automated/Manual Verification
- **Found Report Creation**: Verify 3 questions and 3 answers are saved to Firestore.
- **Claim Flow**: 
    - Verify questions are displayed correctly on the detail view.
    - Verify answer matching logic works (correct vs incorrect).
    - Verify "Send Request" only appears on success.
- **Finder Review**:
    - Verify notification/request appears for the finder.
    - Verify Accept/Reject buttons work.
- **Chat Access**:
    - Verify Chat only starts AFTER acceptance for found items.
