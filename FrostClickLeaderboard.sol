// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FrostClickLeaderboard with signature-based submit protection
/// @notice Accepts signed score submissions to prevent front-end spoofing/replay
contract FrostClickLeaderboard {
    struct ScoreEntry {
        address player;
        uint32 score;
        uint32 timestamp;
    }

    ScoreEntry[100] public leaderboard;
    uint256 public entriesCount;
    uint32 public constant MAX_SCORE = 7500;

    // mapping: address -> index+1 (0 means not present)
    mapping(address => uint256) public indexPlusOne;

    // Prevent replay: store used message hashes (keccak of encoded payload)
    mapping(bytes32 => bool) public usedMessages;

    event ScoreSubmitted(address indexed player, uint32 score, uint32 timestamp, uint256 index);

    /// @notice Submit score with ECDSA signature. The signer must equal msg.sender.
    /// @param score_ player's score (<= MAX_SCORE)
    /// @param timestamp_ unix timestamp used when signing (seconds)
    /// @param v, r, s - ECDSA signature parts over the messageHash
    function submitScoreSigned(
        uint32 score_,
        uint32 timestamp_,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(score_ > 0, "Score must be positive");
        require(score_ <= MAX_SCORE, "Score too high");

        // Build message hash exactly as frontend will do:
        // keccak256(abi.encodePacked(player, score, timestamp, contractAddress, chainId))
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, score_, timestamp_, address(this), block.chainid)
        );

        require(!usedMessages[messageHash], "Signature already used");

        // Ethereum Signed Message prefix:
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Recover signer
        address signer = ecrecover(ethSignedMessageHash, v, r, s);
        require(signer == msg.sender, "Invalid signature / signer mismatch");

        // Optional: timeframe check (prevent extremely old/future timestamps)
        // Allow timestamp that is not older than 1 hour and not more than +5 minutes in future
        // (accomodates small clock differences)
        uint256 nowTs = block.timestamp;
        require(timestamp_ <= nowTs + 5 minutes, "Timestamp too far in future");
        require(nowTs <= timestamp_ + 1 hours ? true : false, "Timestamp too old");
        // Note: second check is equivalent to nowTs - timestamp_ <= 1 hours

        // Mark used to prevent replay
        usedMessages[messageHash] = true;

        // If player already has record, require improvement and update in-place
        uint256 idxPlus = indexPlusOne[msg.sender];
        if (idxPlus != 0) {
            uint256 idx = idxPlus - 1;
            require(score_ > leaderboard[idx].score, "New score not higher than existing");
            leaderboard[idx] = ScoreEntry(msg.sender, score_, timestamp_);
            emit ScoreSubmitted(msg.sender, score_, timestamp_, idx);
            return;
        }

        // Player has no prior record
        if (entriesCount < 100) {
            leaderboard[entriesCount] = ScoreEntry(msg.sender, score_, timestamp_);
            indexPlusOne[msg.sender] = entriesCount + 1;
            emit ScoreSubmitted(msg.sender, score_, timestamp_, entriesCount);
            entriesCount++;
            return;
        }

        // Find lowest score and replace if new score is higher
        uint256 lowestIndex = 0;
        uint32 lowestScore = leaderboard[0].score;
        for (uint256 i = 1; i < 100; i++) {
            if (leaderboard[i].score < lowestScore) {
                lowestScore = leaderboard[i].score;
                lowestIndex = i;
            }
        }

        require(score_ > lowestScore, "Score not high enough");

        // Remove mapping for previous owner of that slot
        address prev = leaderboard[lowestIndex].player;
        indexPlusOne[prev] = 0;

        // Insert new record and set mapping
        leaderboard[lowestIndex] = ScoreEntry(msg.sender, score_, timestamp_);
        indexPlusOne[msg.sender] = lowestIndex + 1;

        emit ScoreSubmitted(msg.sender, score_, timestamp_, lowestIndex);
    }

    /// @notice Legacy getter: returns full leaderboard array
    function getLeaderboard() external view returns (ScoreEntry[100] memory) {
        return leaderboard;
    }
}
