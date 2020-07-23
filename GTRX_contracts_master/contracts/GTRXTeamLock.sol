pragma solidity 0.5.16;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "./interfaces/IGTRXCertifiableToken.sol";
import "./library/BasisPoints.sol";


contract GTRXTeamLock is Initializable {
    using BasisPoints for uint;
    using SafeMath for uint;

    uint public releaseInterval;
    uint public releaseStart;
    uint public releaseBP;

    uint public startingGTRX;
    uint public startingEth;

    address payable[] public teamMemberAddresses;
    uint[] public teamMemberBPs;
    mapping(address => uint) public teamMemberClaimedEth;
    mapping(address => uint) public teamMemberClaimedGTRX;

    IGTRXCertifiableToken private GTRXToken;

    modifier onlyAfterStart {
        require(releaseStart != 0 && now > releaseStart, "Has not yet started.");
        _;
    }

    function() external payable { }

    function initialize(
        uint _releaseInterval,
        uint _releaseBP,
        address payable[] calldata _teamMemberAddresses,
        uint[] calldata _teamMemberBPs,
        IGTRXCertifiableToken _GTRXToken
    ) external initializer {
        require(_teamMemberAddresses.length == _teamMemberBPs.length, "Must have one BP for every address.");

        releaseInterval = _releaseInterval;
        releaseBP = _releaseBP;
        GTRXToken = _GTRXToken;

        for (uint i = 0; i < _teamMemberAddresses.length; i++) {
            teamMemberAddresses.push(_teamMemberAddresses[i]);
        }

        uint totalTeamBP = 0;
        for (uint i = 0; i < _teamMemberBPs.length; i++) {
            teamMemberBPs.push(_teamMemberBPs[i]);
            totalTeamBP = totalTeamBP.add(_teamMemberBPs[i]);
        }
        require(totalTeamBP == 10000, "Must allocate exactly 100% (10000 BP) to team.");
    }

    function claimGTRX() external onlyAfterStart {
        require(checkIfTeamMember(msg.sender), "Can only be called by team members.");
        uint cycle = getCurrentCycleCount();
        uint totalClaimAmount = cycle.mul(startingGTRX.mulBP(releaseBP));
        uint toClaim = totalClaimAmount.sub(teamMemberClaimedGTRX[msg.sender]);
        if (GTRXToken.balanceOf(address(this)) < toClaim) toClaim = GTRXToken.balanceOf(address(this));
        teamMemberClaimedGTRX[msg.sender] = teamMemberClaimedGTRX[msg.sender].add(toClaim);
        GTRXToken.transfer(msg.sender, toClaim);
    }

    function claimEth() external onlyAfterStart {
        require(checkIfTeamMember(msg.sender), "Can only be called by team members.");
        uint cycle = getCurrentCycleCount();
        uint totalClaimAmount = cycle.mul(startingEth.mulBP(releaseBP));
        uint toClaim = totalClaimAmount.sub(teamMemberClaimedEth[msg.sender]);
        if (address(this).balance < toClaim) toClaim = address(this).balance;
        teamMemberClaimedEth[msg.sender] = teamMemberClaimedEth[msg.sender].add(toClaim);
        msg.sender.transfer(toClaim);
    }

    function startRelease() external {
        require(releaseStart == 0, "Has already started.");
        require(address(this).balance != 0, "Must have some ether deposited.");
        require(GTRXToken.balanceOf(address(this)) != 0, "Must have some GTRX deposited.");
        startingGTRX = GTRXToken.balanceOf(address(this));
        startingEth = address(this).balance;
        releaseStart = now.add(24 hours);
    }

    function getCurrentCycleCount() public view returns (uint) {
        if (now <= releaseStart) return 0;
        return now.sub(releaseStart).div(releaseInterval).add(1);
    }

    function checkIfTeamMember(address member) internal view returns (bool) {
        for (uint i; i < teamMemberAddresses.length; i++) {
            if (teamMemberAddresses[i] == member)
                return true;
        }
        return false;
    }

}
